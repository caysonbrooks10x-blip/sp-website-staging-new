# Sprint A Phase 1 — Manual Verification

Ship-gate scenarios. Run these against a dev build (`npm run dev`) after
`git checkout codex/sprint-a-phase-1`. Mark each as ✅ / ❌ / ⚠️ with
notes before opening the release PR.

## Scenario 1 — Invalid AR rejected pre-submission

Setup: model `sora-2`, AR `1:4`, prompt "cat".

Expected: submit button triggers a red toast "Aspect ratio \"1:4\" is
not supported for sora-2…"; no `/api/apimart/*` network request fires.

## Scenario 2 — Auto 2-step AR reframe

Setup: model `wan2.6-i2v-flash`, upload a 1:1 reference image, pick
target AR `16:9`, prompt "kite".

Expected:
1. Toast "Reframing reference to 16:9 via nano-banana-2-new-edit…"
2. Toast "Reframe complete (+$0.025). Submitting video job…"
3. Final video result has 16:9 framing.
4. Retrying the same job does NOT re-run step 1 (parameter
   `two_step_applied: true` is set on the queued item).

## Scenario 3 — Retry on 429

Setup: use dev tools → Network → throttle to force 429, or temporarily
change the ApiMart endpoint to return 429. Run any image job.

Expected:
- First attempt fails with 429.
- Toast "Retrying apimart (attempt 2)…"
- Up to 2 retries (3 attempts total). On 4th failure the error surfaces.

## Scenario 4 — Preemptive + reactive fallback

Setup: model `nano-banana-2` (apimart primary, poyo fallback). Toggle
provider health telemetry to `down` for apimart (or block the apimart
endpoint at the network layer).

Expected:
- Toast "Primary unavailable. Retrying on poyo…"
- Job completes on poyo with the same model id.
- Resulting generation item carries `settings.fallbackUsed = true` and
  `settings.provider = "poyo"`.

## Scenario 5 — Canonical shape in telemetry / console

Setup: open DevTools console on the Studio page. Run any video job on
apimart that takes ≥3 poll cycles.

Expected: every poll logs a `CanonicalJobStatus` object with keys
`{status, progress, urls, error, provider, model, request_id,
attempt, used_fallback}`. No reference to raw `task.data.result.images`
fields in the UI state path.

---

## Regression checks

Run before opening the PR:

```bash
npx tsc --noEmit
npx tsx scripts/verify-provider-routing.ts       # 44/44
npx tsx scripts/verify-sprint-a.ts               # 36/36
npx tsx scripts/integration/run-harness.ts       # 14/14
```

All four must be green. Any failure blocks the Sprint A PR.

## Integration harness — automated proxy for scenarios A–E

`scripts/integration/run-harness.ts` boots mock ApiMart + Poyo HTTP
servers, optionally boots Next.js dev with `APIMART_BASE_URL` /
`POYO_BASE_URL` pointed at the mocks, and exercises:

- **A (normal)**: submit + poll through real Next routes → canonical shape
- **B (invalid)**: character/extract 400 on missing imageUrl; validator rejects invalid AR / n=99
- **C (retry)**: 429 × 2 then 200 → `executeWithFallback` succeeds at attempt 3 with no fallback
- **D (fallback)**: primary 503 × 3 exhausted → poyo fallback, `used_fallback = true`
- **D-bis (gated fallback)**: primary 400 does NOT trigger fallback (Fix 4)
- **E (2-step)**: step-1 submit+poll yields reframed URL; `alreadyApplied=true` short-circuits

This is NOT a substitute for browser-level QA (click flows, credit
decrement rendering, real provider semantics) but it proves the
wire-level behaviour of the canonical-adapter + retry + fallback +
2-step mechanics end-to-end against live HTTP.
