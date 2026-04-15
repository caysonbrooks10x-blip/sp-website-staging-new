/**
 * Sprint A Phase 1 smoke test.
 *
 * Exercises the four new modules introduced in Sprint A without
 * hitting the network. Run:
 *   npx tsx scripts/verify-sprint-a.ts
 */

import {
  adaptApimartStatus,
  adaptApimartSubmission,
  adaptPoyoStatus,
  adaptPoyoSubmission,
  canonicalFailure,
  newRequestId,
} from "../lib/provider-response"
import { validateModelParams } from "../lib/model-capabilities"
import { executeWithFallback, buildProviderCall, shouldAttemptFallback } from "../lib/provider-execution"
import { decideTwoStep, referenceArMismatchesTarget } from "../lib/studio-two-step"

let passed = 0
let failed = 0

function check(name: string, cond: boolean, details?: unknown) {
  if (cond) {
    passed += 1
    return
  }
  failed += 1
  console.error(`  ✘ ${name}`, details ?? "")
}

const ctx = { provider: "apimart", model: "nano-banana-2-new", request_id: newRequestId() }

// ---------- canonical adapters ----------

const apimartPending = adaptApimartStatus({ data: { status: "pending", progress: 0.1 } }, ctx)
check("apimart pending → queued", apimartPending.status === "queued")
check("apimart progress round-trip", apimartPending.progress === 10)

const apimartDone = adaptApimartStatus(
  { data: { status: "completed", progress: 1, result: { images: [{ url: ["https://x/1.png"] }] } } },
  ctx,
)
check("apimart completed → completed", apimartDone.status === "completed")
check("apimart urls extracted", apimartDone.urls[0] === "https://x/1.png")

const apimartFail = adaptApimartStatus({ data: { status: "failed", error: { message: "boom" } } }, ctx)
check("apimart failed → failed", apimartFail.status === "failed")
check("apimart error preserved", apimartFail.error === "boom")

const apimartDirect = adaptApimartSubmission({ data: [{ url: "https://x/d.png" }] }, ctx)
check("apimart direct submission", apimartDirect.kind === "direct" && apimartDirect.canonical.status === "completed")

const apimartTask = adaptApimartSubmission({ data: [{ task_id: "t_123" }] }, ctx)
check("apimart task submission", apimartTask.kind === "task" && apimartTask.taskId === "t_123")

const apimartEmpty = adaptApimartSubmission({ data: [] }, ctx)
check("apimart empty submission → failed", apimartEmpty.kind === "task" && apimartEmpty.canonical.status === "failed")

const poyoRunning = adaptPoyoStatus(
  { state: "processing", progress: 0.5, outputs: [{ url: "https://p/1.mp4", thumbnail_url: "https://p/t.png" }] },
  { provider: "poyo", model: "sora-2", request_id: "req_poyo" },
)
check("poyo processing → running", poyoRunning.status === "running")
check("poyo thumbnail extracted", poyoRunning.thumbnail_url === "https://p/t.png")

const poyoSubmit = adaptPoyoSubmission({ task_id: "t_poyo" }, { provider: "poyo", model: "sora-2", request_id: "r" })
check("poyo submit success", poyoSubmit.taskId === "t_poyo")

const poyoSubmitFail = adaptPoyoSubmission({}, { provider: "poyo", model: "sora-2", request_id: "r" })
check("poyo submit missing task → failed", poyoSubmitFail.canonical.status === "failed")

const failure = canonicalFailure("boom", { provider: "apimart", model: "x", request_id: "r" })
check("canonicalFailure shape", failure.status === "failed" && failure.error === "boom")

// ---------- validator ----------

const okValidation = validateModelParams("nano-banana-2-new", { aspect_ratio: "1:1", n: 1 })
check("validator: 1:1 n=1 ok", okValidation.ok)

const badAr = validateModelParams("sora-2", { aspect_ratio: "1:4" })
check("validator: sora 1:4 rejected", !badAr.ok)

const overLimit = validateModelParams("nano-banana-2-new", { n: 99 })
check("validator: n=99 rejected", !overLimit.ok)

const missingRef = validateModelParams("wan2.2-image-to-video-fast", {}, { hasReferenceImage: false })
check("validator: i2v requires ref image", !missingRef.ok)

const unknownModel = validateModelParams("made-up-model", { aspect_ratio: "1:1" })
check("validator: unknown model → warning, not error", unknownModel.ok && unknownModel.warnings.length > 0)

const unknownBadN = validateModelParams("made-up-model", { n: 99 })
check("validator: unknown model still rejects n>8", !unknownBadN.ok)

const unknownBadAr = validateModelParams("made-up-model", { aspect_ratio: "not-a-ratio" })
check("validator: unknown model rejects malformed AR", !unknownBadAr.ok)

const unknownBadDuration = validateModelParams("made-up-model", { duration: 999 })
check("validator: unknown model rejects wild duration", !unknownBadDuration.ok)

// ---------- retry + fallback ----------

;(async () => {
  let calls = 0
  const primary = buildProviderCall("apimart", "nano-banana-2-new", async () => {
    calls += 1
    if (calls < 3) throw new Error("429 rate limit")
    return "ok-on-third-try"
  })
  const res = await executeWithFallback(primary, null, { baseDelayMs: 1, maxDelayMs: 2 })
  check("retry: succeeds on third attempt", res.result === "ok-on-third-try" && res.attempt === 3 && !res.usedFallback)

  let primaryCalls = 0
  let fallbackCalls = 0
  const primaryDown = buildProviderCall("apimart", "x", async () => {
    primaryCalls += 1
    throw new Error("503 temporarily unavailable")
  })
  const fallbackUp = buildProviderCall("poyo", "x", async () => {
    fallbackCalls += 1
    return "from-fallback"
  })
  const res2 = await executeWithFallback(primaryDown, fallbackUp, { baseDelayMs: 1, maxDelayMs: 2 })
  check(
    "fallback: primary exhausted → fallback succeeds",
    res2.result === "from-fallback" && res2.usedFallback && primaryCalls === 3 && fallbackCalls === 1,
  )

  let nonRetryableCalls = 0
  const nonRetryable = buildProviderCall("apimart", "x", async () => {
    nonRetryableCalls += 1
    throw new Error("400 bad request")
  })
  try {
    await executeWithFallback(nonRetryable, null, { baseDelayMs: 1, maxDelayMs: 2 })
    check("retry: non-retryable error should throw", false)
  } catch {
    check("retry: non-retryable error not retried", nonRetryableCalls === 1)
  }

  // Fix 4: fallback should NOT fire on 400 (payload bug propagates identically)
  let fourxxPrimary = 0
  let fourxxFallback = 0
  const primary400 = buildProviderCall("apimart", "x", async () => {
    fourxxPrimary += 1
    throw new Error("400 bad request")
  })
  const fallback400 = buildProviderCall("poyo", "x", async () => {
    fourxxFallback += 1
    return "should-not-reach"
  })
  try {
    await executeWithFallback(primary400, fallback400, { baseDelayMs: 1, maxDelayMs: 2 })
    check("fallback gated: 400 should throw, not try fallback", false)
  } catch {
    check("fallback gated: primary 400 propagates, fallback not called", fourxxPrimary === 1 && fourxxFallback === 0)
  }

  check("shouldAttemptFallback: 400 → false", !shouldAttemptFallback(new Error("400 bad request")))
  check("shouldAttemptFallback: 429 → true", shouldAttemptFallback(new Error("429 rate limit")))
  check("shouldAttemptFallback: 503 → true", shouldAttemptFallback(new Error("503 temporarily unavailable")))
  check("shouldAttemptFallback: 500 → true (generic server err)", shouldAttemptFallback(new Error("500 internal server error")))
  check("shouldAttemptFallback: 422 → false", !shouldAttemptFallback(new Error("422 unprocessable")))

  // ---------- two-step decisions ----------

  check(
    "two-step: skips when model respects AR",
    decideTwoStep({ referenceImageUrl: "u", targetAspectRatio: "16:9" }, { modelIgnoresArOnRef: false }).needed === false,
  )
  check(
    "two-step: auto fires when AR mismatches + model ignores",
    decideTwoStep(
      { referenceImageUrl: "u", targetAspectRatio: "16:9", referenceAspectRatio: "1:1" },
      { modelIgnoresArOnRef: true },
    ).needed === true,
  )
  check(
    "two-step: alreadyApplied short-circuits",
    decideTwoStep(
      { referenceImageUrl: "u", targetAspectRatio: "16:9", referenceAspectRatio: "1:1" },
      { modelIgnoresArOnRef: true, alreadyApplied: true },
    ).needed === false,
  )
  check("two-step: AR mismatch detector", referenceArMismatchesTarget("1:1", "16:9"))
  check("two-step: AR match detector", !referenceArMismatchesTarget("16:9", "16:9"))

  console.log(`sprint-a smoke: ${passed}/${passed + failed} passed`)
  if (failed > 0) process.exit(1)
})()
