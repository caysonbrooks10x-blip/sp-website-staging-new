import Stripe from "stripe";

import { isDummy } from "./env";

let stripe: Stripe | null = null;

/**
 * Server-side Stripe client. Lazy-initialised so module load doesn't crash
 * when the env var is missing in dev. Throws at first use if missing.
 */
export function getStripe(): Stripe {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || isDummy(key)) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY. Set it in .env.local (live or test secret) before calling Stripe.",
    );
  }
  stripe = new Stripe(key, {
    // Pin API version so behaviour is reproducible across SDK upgrades.
    // Match the dashboard call we captured 2026-05-01.
    apiVersion: "2025-06-30.basil" as Stripe.LatestApiVersion,
  });
  return stripe;
}
