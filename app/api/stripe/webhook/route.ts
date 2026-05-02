import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";
import { getStripe } from "@/lib/stripe-server";
import { lookupKeyByPriceId } from "@/lib/stripe-prices";
import { recordPartneroTransaction } from "@/lib/partnero-server";
import { isDummy } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Stripe webhook receiver.
 *
 * Responsibilities, in order:
 *   1. Verify the request signature (shared secret with Stripe).
 *   2. Idempotency: dedup on event.id so retries are safe.
 *   3. Route by event type:
 *        - checkout.session.completed → grant credits + record Partnero txn
 *          + write initial subscription state to users/{uid}.subscription
 *        - customer.subscription.updated → mirror subscription state
 *          (status, period end, cancel_at_period_end) into Firestore
 *        - customer.subscription.deleted → mark subscription as canceled
 *
 * Failure semantics: any handler throw → return 500 → Stripe retries on
 * standard backoff. Partnero call is idempotent on transaction.key
 * (== session.id). Credit grant is idempotent because we ONLY mark the
 * dedup table after successful processing.
 *
 * Body parsing: Next route handlers expose `request.text()` which gives us
 * the raw body — needed because Stripe signature verification operates on
 * exact bytes. Do NOT use request.json() here.
 */
export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig) {
    return NextResponse.json({ error: "missing stripe-signature" }, { status: 400 });
  }
  if (!secret || isDummy(secret)) {
    // Fail loudly — silently accepting unverified webhooks would let
    // anyone grant themselves credits.
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "signature verify failed";
    return NextResponse.json({ error: "invalid signature", detail: msg }, { status: 400 });
  }

  // Idempotency check: dedup by Stripe event.id in Firestore.
  const db = getAdminDb();
  const dedupRef = db.collection("stripe_webhook_events").doc(event.id);
  const seen = await dedupRef.get();
  if (seen.exists) {
    return NextResponse.json({ ok: true, deduped: true, eventId: event.id });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await mirrorSubscriptionState(sub, event.type);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await mirrorSubscriptionState(sub, event.type);
        break;
      }
      // invoice.payment_succeeded / invoice.paid intentionally not handled
      // for renewals yet — credits granted on checkout.session.completed
      // for the first payment; renewal credit grants are a separate feature.
      default:
        // Acknowledge silently — Stripe sends many event types per the
        // endpoint's enabled list; we only act on the ones we subscribe to.
        break;
    }

    // Mark seen AFTER successful processing so a transient failure leaves
    // the event re-deliverable.
    await dedupRef.set({
      eventId: event.id,
      type: event.type,
      processedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, eventId: event.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "handler failed";
    // 5xx → Stripe will retry. Don't mark seen.
    return NextResponse.json({ error: "handler failed", detail: msg }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  // 1. Recover the Firebase uid. Prefer client_reference_id (set when we
  //    created the session); fall back to metadata.firebase_uid.
  const uid =
    (typeof session.client_reference_id === "string" && session.client_reference_id) ||
    (session.metadata && typeof session.metadata.firebase_uid === "string" ? session.metadata.firebase_uid : null);

  if (!uid) {
    // Defensive: this only happens if a session was created OUTSIDE our
    // route (e.g. a Payment Link without metadata). We log and continue
    // — Partnero's native Stripe Apps integration will still try to match
    // by email, so attribution isn't necessarily lost; we just can't
    // grant credits to an unidentified user.
    console.warn("[stripe-webhook] checkout.session.completed missing uid", session.id);
    return;
  }

  // 2. Resolve credits from metadata first, then by reverse price lookup.
  const credits = resolveCreditsForSession(session);

  // 3. Tell Partnero. Amount is in the smallest currency unit, matching
  //    Stripe's amount_total (already in cents).
  const stripe = getStripe();
  // Re-fetch with line_items expanded — checkout.session.completed events
  // don't always include them.
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price", "subscription"],
  });

  const amountTotal = full.amount_total ?? 0;
  const currency = full.currency ?? "sgd";

  if (amountTotal > 0) {
    await recordPartneroTransaction({
      customerKey: uid,
      transactionKey: full.id, // Stripe session.id doubles as Partnero idempotency key
      amount: amountTotal,
      currency,
      productId: typeof full.metadata?.plan_id === "string" ? full.metadata.plan_id : undefined,
      productName:
        typeof full.metadata?.plan_id === "string"
          ? `${full.metadata.plan_id} (${full.metadata?.cycle ?? "monthly"})`
          : undefined,
    });
  }

  const db = getAdminDb();

  // 4. Grant credits in Firestore. Use FieldValue.increment for atomic
  //    add — concurrent webhooks on the same uid won't race.
  if (credits > 0) {
    await db.collection("users").doc(uid).set(
      {
        tokenBalance: FieldValue.increment(credits),
        lastCreditGrant: {
          source: "stripe_checkout",
          sessionId: full.id,
          credits,
          at: FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );
  }

  // 5. Mirror initial subscription state into users/{uid}.subscription so
  //    the /profile page can show the active plan immediately, before the
  //    customer.subscription.created webhook (which races with this one).
  if (full.subscription && typeof full.subscription !== "string") {
    await writeSubscriptionDoc(uid, full.subscription as Stripe.Subscription, "checkout");
  } else if (typeof full.subscription === "string") {
    // Sub id only (no expansion succeeded for some reason) — minimal record.
    await db.collection("users").doc(uid).set(
      {
        subscription: {
          stripe_subscription_id: full.subscription,
          stripe_customer_id: typeof full.customer === "string" ? full.customer : null,
          plan_id: typeof full.metadata?.plan_id === "string" ? full.metadata.plan_id : null,
          credits: typeof full.metadata?.credits === "string" ? Number(full.metadata.credits) : null,
          cycle: typeof full.metadata?.cycle === "string" ? full.metadata.cycle : null,
          status: "active",
          updated_at: FieldValue.serverTimestamp(),
          source: "checkout-fallback",
        },
      },
      { merge: true },
    );
  }
}

/**
 * Write subscription state to users/{uid}.subscription.
 *
 * Looks up uid from the subscription's metadata.firebase_uid (set on
 * subscription_data.metadata at session creation) OR by stripe_customer_id
 * matching a previously-recorded users/{uid}.subscription.stripe_customer_id.
 *
 * Reads on the standard plan path: O(1) when metadata is present, O(n) over
 * users only when metadata is missing AND we've never seen the customer id
 * before. Acceptable until volume justifies a customers/{stripe_customer_id}
 * → uid mapping table.
 */
async function mirrorSubscriptionState(
  sub: Stripe.Subscription,
  eventType: string,
): Promise<void> {
  const uid = await resolveUidFromSubscription(sub);
  if (!uid) {
    console.warn(
      "[stripe-webhook] subscription event without resolvable uid",
      sub.id,
      "event:",
      eventType,
    );
    return;
  }
  await writeSubscriptionDoc(uid, sub, eventType);
}

async function resolveUidFromSubscription(sub: Stripe.Subscription): Promise<string | null> {
  // Path A — metadata set when we created the Checkout Session.
  const metaUid = (sub.metadata as Record<string, string> | null)?.firebase_uid;
  if (typeof metaUid === "string" && metaUid.length > 0) return metaUid;

  // Path B — reverse-lookup by stripe_customer_id against any existing
  // user record we've already populated.
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return null;
  const db = getAdminDb();
  const snap = await db
    .collection("users")
    .where("subscription.stripe_customer_id", "==", customerId)
    .limit(1)
    .get();
  if (!snap.empty) return snap.docs[0].id;
  return null;
}

async function writeSubscriptionDoc(
  uid: string,
  sub: Stripe.Subscription,
  source: string,
): Promise<void> {
  const item = sub.items?.data?.[0];
  const priceId = item?.price?.id ?? null;
  const planKey = priceId ? lookupKeyByPriceId(priceId) : null;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

  // Stripe's TS types put current_period_end on subscription items in newer
  // API versions; accept either source for forward compatibility.
  const itemAny = item as unknown as { current_period_end?: number } | undefined;
  const subAny = sub as unknown as { current_period_end?: number };
  const currentPeriodEnd = itemAny?.current_period_end ?? subAny.current_period_end ?? null;

  const db = getAdminDb();
  await db.collection("users").doc(uid).set(
    {
      subscription: {
        stripe_subscription_id: sub.id,
        stripe_customer_id: customerId,
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        current_period_end: currentPeriodEnd,
        canceled_at: sub.canceled_at ?? null,
        plan_id: planKey?.planId ?? (sub.metadata as Record<string, string> | null)?.plan_id ?? null,
        credits: planKey?.credits ?? null,
        cycle: planKey?.cycle ?? (sub.metadata as Record<string, string> | null)?.cycle ?? null,
        price_id: priceId,
        updated_at: FieldValue.serverTimestamp(),
        source,
      },
    },
    { merge: true },
  );
}

function resolveCreditsForSession(session: Stripe.Checkout.Session): number {
  // Path A: metadata set when we created the session.
  const fromMeta = session.metadata?.credits;
  if (fromMeta && /^\d+$/.test(fromMeta)) return Number(fromMeta);

  // Path B: reverse-lookup the line item's price → plan key.
  const lineItem = (session as Stripe.Checkout.Session & {
    line_items?: { data?: Array<{ price?: { id?: string } | null }> };
  }).line_items;
  const priceId = lineItem?.data?.[0]?.price?.id;
  if (priceId) {
    const key = lookupKeyByPriceId(priceId);
    if (key) return key.credits;
  }
  return 0;
}
