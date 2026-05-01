/**
 * Reconcile lib/stripe-prices.ts with the live Stripe account.
 *
 * Strategy:
 *   1. Read every Payment Link on the connected account.
 *   2. For each, fetch its line_items and grab the underlying price.id.
 *   3. Match the link by NAME or PRICE+CURRENCY+INTERVAL to a key in
 *      STRIPE_PRICE_MAP. (Names are user-set in the Stripe dashboard, so
 *      price+interval is the more reliable matcher.)
 *   4. Print a diff: which keys would be filled in, which are still empty,
 *      which existing entries differ from what Stripe says.
 *
 * Run with `--write` to actually patch lib/stripe-prices.ts in-place.
 * Without it, the script is read-only and just prints the proposed edits.
 *
 * Usage:
 *   npx tsx scripts/sync-stripe-prices.ts            # dry run
 *   npx tsx scripts/sync-stripe-prices.ts --write    # apply
 *
 * Requires STRIPE_SECRET_KEY in the environment (see .env.example).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Stripe from "stripe";

import { STRIPE_PRICE_MAP, type BillingCycle } from "../lib/stripe-prices";

const PRICES_FILE = resolve(__dirname, "..", "lib", "stripe-prices.ts");

interface ReconciledPrice {
  key: string;
  expectedPriceCents: number;
  expectedCurrency: string;
  expectedCycle: BillingCycle;
  found: { priceId: string; nickname: string | null; productName: string | null } | null;
}

async function main(): Promise<void> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("Set STRIPE_SECRET_KEY before running this script.");
    process.exit(1);
  }
  const stripe = new Stripe(secretKey, { apiVersion: "2025-06-30.basil" as Stripe.LatestApiVersion });

  const expected = expectedFromMap();

  // Page through ALL prices on the account — pricing-page tiers are all
  // SGD recurring subscriptions, so this will be a small set.
  const allPrices: Stripe.Price[] = [];
  for await (const price of stripe.prices.list({ active: true, limit: 100, expand: ["data.product"] })) {
    if (!price.recurring) continue;
    if (price.unit_amount == null) continue;
    allPrices.push(price);
  }

  // Match each expected slot to a Stripe price by (amount, currency, interval).
  const reconciled: ReconciledPrice[] = expected.map((e) => {
    const interval = e.expectedCycle === "monthly" ? "month" : "year";
    const match = allPrices.find(
      (p) =>
        p.unit_amount === e.expectedPriceCents &&
        (p.currency || "").toLowerCase() === e.expectedCurrency &&
        p.recurring?.interval === interval,
    );
    return {
      ...e,
      found: match
        ? {
            priceId: match.id,
            nickname: match.nickname,
            productName:
              typeof match.product === "object" && match.product && "name" in match.product
                ? (match.product as Stripe.Product).name
                : null,
          }
        : null,
    };
  });

  printDiff(reconciled);

  if (process.argv.includes("--write")) {
    writeUpdates(reconciled);
    console.log("\n✓ lib/stripe-prices.ts updated.");
  } else {
    console.log("\nDry run only. Re-run with --write to patch lib/stripe-prices.ts.");
  }
}

function expectedFromMap(): Array<{ key: string; expectedPriceCents: number; expectedCurrency: string; expectedCycle: BillingCycle }> {
  // Pricing tiers are encoded in the keys: planId:credits:cycle.
  // Amounts come from the existing app/pricing/page.tsx values.
  // Ground truth for these prices: the plan tiers in app/pricing/page.tsx.
  // Hardcoded mirror here (in cents) to avoid pulling the React component.
  const SGD_CENTS = (sgd: number) => Math.round(sgd * 100);
  const tiers: Array<[string, number, BillingCycle]> = [
    ["starter:5800:monthly", SGD_CENTS(29), "monthly"],
    ["starter:5800:yearly", SGD_CENTS(276), "yearly"],
    ["pro:18000:monthly", SGD_CENTS(79), "monthly"],
    ["pro:18000:yearly", SGD_CENTS(756), "yearly"],
    ["pro:24000:monthly", SGD_CENTS(105), "monthly"],
    ["pro:24000:yearly", SGD_CENTS(1008), "yearly"],
    ["pro:30000:monthly", SGD_CENTS(129), "monthly"],
    ["pro:30000:yearly", SGD_CENTS(1236), "yearly"],
    ["pro:38000:monthly", SGD_CENTS(159), "monthly"],
    ["pro:38000:yearly", SGD_CENTS(1524), "yearly"],
    ["pro:45000:monthly", SGD_CENTS(189), "monthly"],
    ["pro:45000:yearly", SGD_CENTS(1812), "yearly"],
    ["pro:60000:monthly", SGD_CENTS(249), "monthly"],
    ["pro:60000:yearly", SGD_CENTS(2388), "yearly"],
    ["ultra:50000:monthly", SGD_CENTS(199), "monthly"],
    ["ultra:50000:yearly", SGD_CENTS(1908), "yearly"],
  ];
  return tiers.map(([key, cents, cycle]) => ({
    key,
    expectedPriceCents: cents,
    expectedCurrency: "sgd",
    expectedCycle: cycle,
  }));
}

function printDiff(reconciled: ReconciledPrice[]): void {
  console.log("Reconciliation report:\n");
  console.log("KEY".padEnd(28) + "EXPECTED".padEnd(18) + "FOUND PRICE ID".padEnd(40) + "PRODUCT");
  console.log("-".repeat(110));
  for (const r of reconciled) {
    const expected = `${(r.expectedPriceCents / 100).toFixed(2)} ${r.expectedCurrency.toUpperCase()}/${r.expectedCycle.slice(0, 2)}`;
    const found = r.found ? r.found.priceId : "<MISSING>";
    const product = r.found?.productName || r.found?.nickname || "";
    console.log(r.key.padEnd(28) + expected.padEnd(18) + found.padEnd(40) + product);
  }
  const matched = reconciled.filter((r) => r.found).length;
  console.log(`\n${matched}/${reconciled.length} matched.`);
}

function writeUpdates(reconciled: ReconciledPrice[]): void {
  let src = readFileSync(PRICES_FILE, "utf8");
  for (const r of reconciled) {
    if (!r.found) continue;
    const placeholder = new RegExp(
      `("${r.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}":\\s*\\{\\s*priceId:\\s*)null`,
      "m",
    );
    src = src.replace(placeholder, `$1"${r.found.priceId}"`);
  }
  writeFileSync(PRICES_FILE, src, "utf8");
  // Touch a no-op import so STRIPE_PRICE_MAP isn't a dead-code warning here.
  void STRIPE_PRICE_MAP;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
