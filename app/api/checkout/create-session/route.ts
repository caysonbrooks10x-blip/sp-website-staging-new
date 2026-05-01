import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { getStripe } from "@/lib/stripe-server";
import { resolvePriceId, type BillingCycle, type PriceKey } from "@/lib/stripe-prices";

export const runtime = "nodejs";
export const maxDuration = 30;

type CreateSessionBody = {
  planId?: string;
  credits?: number;
  cycle?: string;
  /** Optional override for redirect base — defaults to request origin. */
  origin?: string;
};

/**
 * Create a Stripe Checkout Session for the signed-in Firebase user.
 *
 * Why this route instead of the static buy.stripe.com Payment Links:
 *   - We set `client_reference_id: firebaseUid`. The Stripe webhook reads it
 *     back and tells Partnero "transaction belongs to customer<key=uid>".
 *     Email-based attribution (Partnero ↔ Stripe Apps default) breaks when
 *     the buyer pays with Apple Pay / PayPal under a different email; uid
 *     keying is bulletproof.
 *   - We can also prefill `customer_email` from Firebase, which silently
 *     keeps email-based attribution working as a redundant safety net.
 *   - Future: subscription upgrades, prorations, credit top-ups — all need
 *     server-side session creation.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let uid: string;
  let userEmail: string | null = null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
    userEmail = decoded.email ?? null;
  } catch {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CreateSessionBody | null;
  const planId = body?.planId;
  const credits = typeof body?.credits === "number" ? body.credits : null;
  const cycle = body?.cycle;

  if (
    planId !== "starter" && planId !== "pro" && planId !== "ultra" ||
    credits === null ||
    (cycle !== "monthly" && cycle !== "yearly")
  ) {
    return NextResponse.json(
      { error: "invalid plan", detail: "planId must be starter|pro|ultra, credits must be a number, cycle must be monthly|yearly" },
      { status: 400 },
    );
  }

  const key: PriceKey = { planId, credits, cycle: cycle as BillingCycle };
  const priceId = resolvePriceId(key);
  if (!priceId) {
    return NextResponse.json(
      {
        error: "price not configured",
        detail: `No Stripe Price ID mapped for ${planId}:${credits}:${cycle}. Run scripts/sync-stripe-prices.ts to populate STRIPE_PRICE_MAP.`,
      },
      { status: 503 },
    );
  }

  // Derive redirect origin. Prefer the request's own origin so previews
  // route back to themselves; allow body override for edge cases.
  const requestOrigin = (() => {
    try {
      return new URL(request.url).origin;
    } catch {
      return "https://studiox-live.vercel.app";
    }
  })();
  const origin = body?.origin || requestOrigin;

  const stripe = getStripe();

  try {
    // Subscription mode for monthly/yearly recurring prices.
    // If we ever sell one-time credit packs from this route, branch on the
    // price.recurring shape — for now every plan is a subscription.
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // KEY ATTRIBUTION FIELD — the webhook reads this back as session.client_reference_id
      // and uses it as Partnero customer.key.
      client_reference_id: uid,
      // Belt-and-braces: also prefill the email so Partnero's native Stripe
      // matching works as a fallback if the webhook ever fails to fire.
      ...(userEmail ? { customer_email: userEmail } : {}),
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      // Pass plan metadata into the session so the webhook can grant the
      // right credit balance even if the price→plan reverse lookup fails
      // (e.g. during a price migration).
      metadata: {
        firebase_uid: uid,
        plan_id: planId,
        credits: String(credits),
        cycle,
      },
      subscription_data: {
        metadata: {
          firebase_uid: uid,
          plan_id: planId,
          credits: String(credits),
          cycle,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown stripe error";
    return NextResponse.json({ error: "stripe error", detail: msg }, { status: 502 });
  }
}
