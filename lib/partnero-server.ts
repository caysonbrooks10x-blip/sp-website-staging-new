/**
 * Server-side Partnero REST client.
 *
 * Why server-side: the Stripe webhook is the only place we're sure a payment
 * actually completed. Recording the transaction here — keyed on Firebase uid
 * via client_reference_id — guarantees attribution regardless of whether the
 * email used at Stripe Checkout matches the email on the Firebase account.
 *
 * Idempotent: Partnero treats the `key` field as a unique transaction ID.
 * Stripe webhooks can fire multiple times (retries on 5xx); reusing the same
 * Stripe session.id as the Partnero key prevents double-credit.
 *
 * If POSTing to Partnero fails, we throw — the caller (the webhook handler)
 * returns 5xx, Stripe retries on its standard backoff, idempotency keeps
 * us safe.
 */

import { isDummy } from "./env";

const PARTNERO_BASE = "https://api.partnero.com/v1";

interface CreateTransactionInput {
  /** Firebase uid — the same value passed as Checkout `client_reference_id`. */
  customerKey: string;
  /** Stripe session.id — also used as the Partnero idempotency key. */
  transactionKey: string;
  /** Amount in the currency's smallest unit (e.g. cents for USD, cents for SGD). */
  amount: number;
  /** ISO 4217 lowercase, e.g. "sgd", "usd". */
  currency: string;
  /** Optional metadata. */
  productId?: string;
  productName?: string;
}

export async function recordPartneroTransaction(
  input: CreateTransactionInput,
): Promise<void> {
  const apiKey = process.env.PARTNERO_API_KEY;
  if (!apiKey || isDummy(apiKey)) {
    throw new Error("Missing PARTNERO_API_KEY env var");
  }

  // Partnero's POST /v1/transactions accepts:
  //   { key, amount, currency, customer: { key }, product: { key, name } }
  // - `key` is the idempotency / dedup field on Partnero's side.
  //   Max length 64 — Stripe session IDs can be 67+, so we truncate.
  //   The truncated form is still unique because Stripe IDs are random
  //   high-entropy suffixes; collisions in the first 64 chars are
  //   astronomically unlikely.
  // - `customer.key` matches the customer record Partnero created when
  //   the client-side `po('customers', 'signup', { key: uid, ... })`
  //   call fired in components/partnero-identify.tsx — but ONLY if the
  //   user arrived via a partner referral cookie. Unattributed signups
  //   don't have a Partnero customer record (by design — Partnero only
  //   tracks affiliated traffic), so transactions for them 422.
  const body = {
    key: input.transactionKey.slice(0, 64),
    amount: input.amount,
    currency: input.currency.toLowerCase(),
    customer: { key: input.customerKey },
    ...(input.productId
      ? { product: { key: input.productId, name: input.productName ?? input.productId } }
      : {}),
  };

  const res = await fetch(`${PARTNERO_BASE}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  // Partnero returns 200/201 on create AND on idempotent re-create.
  // 409 (conflict) is also OK — means we've already recorded this txn.
  if (res.status === 200 || res.status === 201 || res.status === 409) {
    return;
  }

  // 422 unprocessable usually means the customer doesn't exist on
  // Partnero (unattributed signup — no `?via=` cookie at signup time).
  // This is not a webhook failure — it just means there's no commission
  // to record for this purchase. Log and return so the calling webhook
  // doesn't 5xx and trigger Stripe retries.
  if (res.status === 422) {
    const errText = await res.text().catch(() => "<no body>");
    console.warn(
      "[partnero] 422 — likely unattributed customer, skipping commission record:",
      errText.slice(0, 200),
    );
    return;
  }

  const errText = await res.text().catch(() => "<no body>");
  throw new Error(
    `Partnero /v1/transactions failed: ${res.status} ${errText.slice(0, 300)}`,
  );
}
