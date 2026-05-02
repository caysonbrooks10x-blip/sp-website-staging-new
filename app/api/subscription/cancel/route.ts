import { NextResponse } from "next/server";

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { getStripe } from "@/lib/stripe-server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Cancel the signed-in user's active Stripe subscription.
 *
 * Default behaviour: cancel at period end (user keeps access through
 * what they already paid for, no refund needed). Pass `{ immediate: true }`
 * to terminate immediately (useful for refund flows; not currently surfaced
 * from the UI).
 *
 * Reads `users/{uid}.subscription.stripe_subscription_id` from Firestore
 * and forwards to Stripe's API. We don't trust the client to pass the
 * subscription id — that would let anyone cancel anyone's sub if they
 * could guess a sub_xxx.
 *
 * The eventual `customer.subscription.updated` (or `.deleted`) webhook
 * will mirror the new state into Firestore. We optimistically write
 * `cancel_at_period_end: true` here too so the UI updates immediately
 * without waiting for the webhook round-trip.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await getAdminAuth().verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { immediate?: boolean };
  const immediate = body.immediate === true;

  const db = getAdminDb();
  const userDoc = await db.collection("users").doc(uid).get();
  const sub = userDoc.data()?.subscription as
    | { stripe_subscription_id?: string; status?: string }
    | undefined;

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json(
      { error: "no active subscription" },
      { status: 404 },
    );
  }
  if (sub.status === "canceled") {
    return NextResponse.json({ ok: true, alreadyCanceled: true });
  }

  const stripe = getStripe();
  try {
    const updated = immediate
      ? await stripe.subscriptions.cancel(sub.stripe_subscription_id)
      : await stripe.subscriptions.update(sub.stripe_subscription_id, {
          cancel_at_period_end: true,
        });

    // Optimistic Firestore mirror so /profile reflects the change before
    // the webhook fires. The webhook will overwrite with the same data
    // (idempotent) within ~1-2s.
    await db.collection("users").doc(uid).set(
      {
        subscription: {
          status: updated.status,
          cancel_at_period_end: updated.cancel_at_period_end ?? immediate,
          canceled_at: updated.canceled_at ?? null,
        },
      },
      { merge: true },
    );

    return NextResponse.json({
      ok: true,
      status: updated.status,
      cancel_at_period_end: updated.cancel_at_period_end ?? immediate,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "stripe error";
    return NextResponse.json({ error: "cancel failed", detail: msg }, { status: 502 });
  }
}
