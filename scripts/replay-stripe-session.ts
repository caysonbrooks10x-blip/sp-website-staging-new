/**
 * One-shot manual replay of the webhook handler for a single Stripe
 * Checkout Session. Use when the webhook URL was misconfigured / the
 * production endpoint 404'd / Stripe retries haven't caught up yet.
 *
 * Idempotent against itself — checks stripe_webhook_events/{session.id}
 * before granting credits.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... \
 *     npx tsx --env-file=.env.local scripts/replay-stripe-session.ts cs_live_xxx
 */
import Stripe from "stripe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import { lookupKeyByPriceId } from "../lib/stripe-prices";
import { recordPartneroTransaction } from "../lib/partnero-server";

async function main(): Promise<void> {
  const sessionId = process.argv[2];
  if (!sessionId) throw new Error("Pass session id as argv[2]");

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-06-30.basil" as Stripe.LatestApiVersion,
  });

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    });
  }
  const db = getFirestore();

  const full = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price", "subscription"],
  });

  const uid =
    (typeof full.client_reference_id === "string" && full.client_reference_id) ||
    (full.metadata && typeof full.metadata.firebase_uid === "string" ? full.metadata.firebase_uid : null);

  console.log("session.id:", full.id);
  console.log("uid:", uid);
  console.log("amount_total:", full.amount_total, full.currency);
  console.log("metadata:", full.metadata);

  if (!uid) {
    throw new Error("No uid on session — cannot replay.");
  }

  // Idempotency
  const dedupRef = db.collection("stripe_webhook_events").doc(`replay_${full.id}`);
  if ((await dedupRef.get()).exists) {
    console.log("already replayed — exiting.");
    return;
  }

  // Resolve credits
  let credits = 0;
  const fromMeta = full.metadata?.credits;
  if (fromMeta && /^\d+$/.test(fromMeta)) credits = Number(fromMeta);
  if (credits === 0) {
    const li = (full as Stripe.Checkout.Session & {
      line_items?: { data?: Array<{ price?: { id?: string } | null }> };
    }).line_items;
    const priceId = li?.data?.[0]?.price?.id;
    if (priceId) {
      const k = lookupKeyByPriceId(priceId);
      if (k) credits = k.credits;
    }
  }
  console.log("credits to grant:", credits);

  // Partnero (skip on $0 to avoid junk transactions)
  if ((full.amount_total ?? 0) > 0) {
    await recordPartneroTransaction({
      customerKey: uid,
      transactionKey: full.id,
      amount: full.amount_total!,
      currency: full.currency ?? "sgd",
      productId: typeof full.metadata?.plan_id === "string" ? full.metadata.plan_id : undefined,
      productName: typeof full.metadata?.plan_id === "string"
        ? `${full.metadata.plan_id} (${full.metadata?.cycle ?? "monthly"})`
        : undefined,
    });
    console.log("partnero: recorded");
  } else {
    console.log("partnero: skipped (amount_total=0, no commission to record)");
  }

  // Credit grant
  if (credits > 0) {
    await db.collection("users").doc(uid).set(
      {
        tokenBalance: FieldValue.increment(credits),
        lastCreditGrant: {
          source: "stripe_replay",
          sessionId: full.id,
          credits,
          at: FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );
    console.log("firestore: tokenBalance += " + credits);
  }

  // Subscription mirror
  const sub = full.subscription;
  if (sub && typeof sub !== "string") {
    const item = sub.items?.data?.[0];
    const priceId = item?.price?.id ?? null;
    const planKey = priceId ? lookupKeyByPriceId(priceId) : null;
    const itemAny = item as unknown as { current_period_end?: number } | undefined;
    const subAny = sub as unknown as { current_period_end?: number };
    const cpe = itemAny?.current_period_end ?? subAny.current_period_end ?? null;
    await db.collection("users").doc(uid).set(
      {
        subscription: {
          stripe_subscription_id: sub.id,
          stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
          status: sub.status,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          current_period_end: cpe,
          canceled_at: sub.canceled_at ?? null,
          plan_id: planKey?.planId ?? full.metadata?.plan_id ?? null,
          credits: planKey?.credits ?? null,
          cycle: planKey?.cycle ?? full.metadata?.cycle ?? null,
          price_id: priceId,
          updated_at: FieldValue.serverTimestamp(),
          source: "replay",
        },
      },
      { merge: true },
    );
    console.log("firestore: subscription mirrored", sub.id, sub.status);
  }

  await dedupRef.set({ eventId: `replay_${full.id}`, sessionId: full.id, processedAt: FieldValue.serverTimestamp() });
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); });
