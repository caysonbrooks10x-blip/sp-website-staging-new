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
 * Three responsibilities, in order:
 *   1. Verify the request signature (shared secret with Stripe).
 *   2. Idempotency: if we've already processed this event id, return 200
 *      without doing anything. Stripe retries on 5xx with exponential
 *      backoff; this dedup table makes retries safe.
 *   3. On `checkout.session.completed`:
 *        a. Tell Partnero a transaction occurred (uid + amount).
 *        b. Grant the credit balance in Firestore users/{uid}.tokenBalance.
 *
 * Failure semantics: if either (3a) or (3b) throws, we return 500 — Stripe
 * will retry. The Partnero call is idempotent on transaction.key (== Stripe
 * session.id), and the Firestore credit grant is idempotent because we
 * record the session.id in the dedup table BEFORE granting credits and
 * skip if seen.
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
    // Only completed checkouts grant credits / record commission. Other
    // event types (subscription updated, invoice paid for renewals, etc.)
    // are deliberately not handled yet — add cases below as needed.
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
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
    expand: ["line_items.data.price"],
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

  // 4. Grant credits in Firestore. Use FieldValue.increment for atomic
  //    add — concurrent webhooks on the same uid won't race.
  if (credits > 0) {
    const db = getAdminDb();
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
