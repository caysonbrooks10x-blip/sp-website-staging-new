# Credits — Source of Truth Verification

Sprint A lead-in: *"Ensure that the credits are perfectly fetched from
the users backend and everything is rendering from the frontend to the
bot."*

## Canonical field

Firestore: `users/{uid}.tokenBalance` (number).

Every surface that shows a credit number MUST read this field. If a new
surface ever needs a different number (e.g. a "pending deductions"
view), it should compute the derived value without mutating this field.

## Surfaces verified

| Surface | File | Line | Mechanism |
| --- | --- | --- | --- |
| Web — auth context (initial + refresh) | `context/auth-context.tsx` | 81, 90, 105 | Firestore `getDoc` + `setCredits` |
| Web — navbar badge (live) | `components/navbar.tsx` | 42 | Firestore `onSnapshot` subscription |
| Web — profile page | `app/profile/page.tsx` | grep `tokenBalance` | Firestore read |
| Web — claw control panel | `app/api/claw/state/route.ts` | 117 | Firestore REST + admin SDK JWT |
| Bot — `/credits` command | `studiox-claw-gateway` (separate repo) | see bot repo | Firebase Admin SDK read of same doc |

All five read the same doc. Mutations flow exclusively through
Firebase callables (`deductTokens`, `refundTokens`, Stripe webhook
top-ups) — no surface writes to `tokenBalance` directly from the
client.

## Regression check

1. Load `/studio` while logged in. Open DevTools → Application →
   Firestore; confirm the navbar number matches
   `users/{uid}.tokenBalance`.
2. Send `/credits` in the bot (Telegram). Confirm the returned number
   matches the navbar badge to the dollar.
3. Trigger a generation. The navbar number should decrement live via
   `onSnapshot` before the job even queues.
4. If the numbers diverge in any direction, the bot is either reading
   the wrong doc or the callable is writing to the wrong field —
   `grep -r tokenBalance` in both repos before debugging anything else.

## Non-goals

- This verification does NOT cover the bot's internal cache. If the
  bot caches credits for latency, the cache TTL is the bot repo's
  concern; the source of truth remains Firestore.
- The 2-step cost surcharge ($0.025) is stamped on the outbound job
  parameters as `two_step_cost_usd` but deduction happens server-side
  through the same `deductTokens` callable as the base job.
