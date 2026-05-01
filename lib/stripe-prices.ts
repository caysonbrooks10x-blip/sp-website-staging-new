/**
 * Server-side map of (planId, tier-credits, billing cycle) → Stripe Price ID.
 *
 * Why this lives server-side: the client cannot be trusted to pick the right
 * priceId — that would let anyone buy any plan at any tier. The client sends
 * a high-level selector (planId/credits/cycle); we resolve to the priceId here.
 *
 * Population: run `npx tsx scripts/sync-stripe-prices.ts` after activating /
 * creating Payment Links in Stripe. The script reads each Payment Link's
 * line_items, extracts the price ID, and writes it back here.
 *
 * Until populated, the create-session route returns 503 for the affected
 * (planId, tier, cycle) combo with a clear error message.
 */

export type BillingCycle = "monthly" | "yearly";

export interface PriceKey {
  planId: "starter" | "pro" | "ultra";
  /** monthly credits (5800 / 18000+ / 50000) — the discriminator within a plan */
  credits: number;
  cycle: BillingCycle;
}

interface PriceEntry {
  priceId: string | null;
  /** Optional human note; helps audits and migrations. */
  note?: string;
}

/**
 * Each (planId, credits, cycle) maps to ONE Stripe price.
 * Set priceId to null when the price hasn't been created/synced yet.
 *
 * Prices below mirror app/pricing/page.tsx tiers verified 2026-05-01.
 */
export const STRIPE_PRICE_MAP: Record<string, PriceEntry> = {
  // Starter — single tier
  "starter:5800:monthly":  { priceId: "price_1TDz6aRuOCpoGOzJZ8Fw8q9d", note: "$29 SGD/mo · 5,800 credits" },
  "starter:5800:yearly":   { priceId: "price_1TEPoDRuOCpoGOzJ9KJYiKTU", note: "$276 SGD/yr · 69,600 credits" },

  // Pro — 6 credit tiers
  "pro:18000:monthly":     { priceId: "price_1TELMURuOCpoGOzJN3bzphhV", note: "$79 SGD/mo · 18,000 credits" },
  "pro:18000:yearly":      { priceId: "price_1TEPyQRuOCpoGOzJnDqGiBxL", note: "$756 SGD/yr · 216,000 credits" },
  "pro:24000:monthly":     { priceId: "price_1TELTLRuOCpoGOzJKjcHqjH0", note: "$105 SGD/mo · 24,000 credits" },
  "pro:24000:yearly":      { priceId: "price_1TEQ37RuOCpoGOzJJlsWZYIE", note: "$1,008 SGD/yr · 288,000 credits" },
  "pro:30000:monthly":     { priceId: "price_1TELTLRuOCpoGOzJxmdIZup9", note: "$129 SGD/mo · 30,000 credits" },
  "pro:30000:yearly":      { priceId: "price_1TEQ37RuOCpoGOzJ4hcaXiDW", note: "$1,236 SGD/yr · 360,000 credits" },
  "pro:38000:monthly":     { priceId: "price_1TELTLRuOCpoGOzJA0MAsgte", note: "$159 SGD/mo · 38,000 credits" },
  "pro:38000:yearly":      { priceId: "price_1TEQ37RuOCpoGOzJxGY4jRdF", note: "$1,524 SGD/yr · 456,000 credits" },
  "pro:45000:monthly":     { priceId: "price_1TELTLRuOCpoGOzJvr5FSX2b", note: "$189 SGD/mo · 45,000 credits" },
  "pro:45000:yearly":      { priceId: "price_1TEQ37RuOCpoGOzJvp8sdwe0", note: "$1,812 SGD/yr · 540,000 credits" },
  "pro:60000:monthly":     { priceId: "price_1TELTLRuOCpoGOzJxSwPi6d7", note: "$249 SGD/mo · 60,000 credits" },
  "pro:60000:yearly":      { priceId: "price_1TEQ37RuOCpoGOzJmYMEJVT3", note: "$2,388 SGD/yr · 720,000 credits" },

  // Ultra — single tier
  "ultra:50000:monthly":   { priceId: "price_1TDzTqRuOCpoGOzJahUOLBxb", note: "$199 SGD/mo · 50,000 credits" },
  "ultra:50000:yearly":    { priceId: "price_1TEQ5sRuOCpoGOzJRr4p0JA2", note: "$1,908 SGD/yr · 600,000 credits" },
};

export function priceKeyToString({ planId, credits, cycle }: PriceKey): string {
  return `${planId}:${credits}:${cycle}`;
}

export function resolvePriceId(key: PriceKey): string | null {
  const entry = STRIPE_PRICE_MAP[priceKeyToString(key)];
  return entry?.priceId ?? null;
}

/**
 * Reverse lookup: from a Stripe price ID, return the structured key.
 * Used by the webhook to compute credit grants from session.line_items.
 */
export function lookupKeyByPriceId(priceId: string): PriceKey | null {
  for (const [k, v] of Object.entries(STRIPE_PRICE_MAP)) {
    if (v.priceId === priceId) {
      const [planId, creditsStr, cycle] = k.split(":");
      return {
        planId: planId as PriceKey["planId"],
        credits: Number(creditsStr),
        cycle: cycle as BillingCycle,
      };
    }
  }
  return null;
}
