/**
 * Sprint A integration harness — end-to-end behaviour verification
 * without a browser.
 *
 * Two phases:
 *   Phase 1 (wrapper-level): executeWithFallback + real HTTP mocks.
 *     Proves retry/backoff/fallback gating works against live network
 *     semantics — not just in-memory functions.
 *   Phase 2 (route-level): boots Next.js dev, repoints it at the mock
 *     providers via APIMART_BASE_URL/POYO_BASE_URL, and exercises
 *     /api/apimart/* + /api/apimart/character/extract.
 *     Proves the Next routes honour the canonical adapter contract and
 *     propagate request_id + error semantics.
 *
 * Run:  npx tsx scripts/integration/run-harness.ts
 */

import { spawn, type ChildProcess } from "node:child_process"
import { setTimeout as wait } from "node:timers/promises"

import {
  startMockApimart,
  startMockPoyo,
  type MockProvider,
} from "./mock-providers"
import {
  executeWithFallback,
  buildProviderCall,
} from "../../lib/provider-execution"
import { adaptApimartStatus, adaptApimartSubmission } from "../../lib/provider-response"
import { validateModelParams } from "../../lib/model-capabilities"
import { decideTwoStep } from "../../lib/studio-two-step"

let passed = 0
let failed = 0
const results: Array<{ name: string; pass: boolean; note?: string }> = []

function record(name: string, pass: boolean, note?: string) {
  results.push({ name, pass, note })
  if (pass) passed += 1
  else failed += 1
}

async function fetchJson(url: string, init?: RequestInit): Promise<{ status: number; body: any }> {
  const res = await fetch(url, init)
  let body: any = null
  try {
    body = await res.json()
  } catch {
    body = null
  }
  return { status: res.status, body }
}

// -------------------------------------------------------------------
// Phase 1 — wrapper-level scenarios
// -------------------------------------------------------------------

async function phase1(mockApimart: MockProvider, mockPoyo: MockProvider) {
  console.log("\n=== Phase 1: wrapper-level (executeWithFallback + HTTP) ===")

  // Scenario A — normal success flows through canonical adapter.
  mockApimart.setScript({ kind: "ok-direct", imageUrl: "https://mock.test/a.png" })
  mockApimart.resetCallCount()
  {
    const call = buildProviderCall("apimart", "nano-banana-2", async () => {
      const res = await fetch(`${mockApimart.url}/images/generations`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer mock" },
        body: JSON.stringify({ model: "nano-banana-2", prompt: "a cat" }),
      })
      if (!res.ok) throw new Error(`apimart ${res.status}`)
      return await res.json()
    })
    const exec = await executeWithFallback(call, null, { baseDelayMs: 1, maxDelayMs: 2 })
    const adapted = adaptApimartSubmission(exec.result, {
      provider: "apimart",
      model: "nano-banana-2",
      request_id: "req_test_a",
    })
    record(
      "A/wrapper: direct-image success → canonical completed",
      adapted.kind === "direct" &&
        adapted.canonical.status === "completed" &&
        adapted.canonical.urls[0] === "https://mock.test/a.png" &&
        exec.attempt === 1 &&
        !exec.usedFallback,
      `attempt=${exec.attempt} usedFallback=${exec.usedFallback}`,
    )
  }

  // Scenario B — invalid input rejected pre-submit.
  {
    const invalid = validateModelParams("sora-2", { aspect_ratio: "1:4" })
    const unknown = validateModelParams("made-up-model", { n: 99 })
    record(
      "B/wrapper: validator rejects invalid AR on registered model",
      !invalid.ok && invalid.errors[0].includes("1:4"),
    )
    record(
      "B/wrapper: validator rejects wild n on unknown model (baseline)",
      !unknown.ok && unknown.errors.join(" ").toLowerCase().includes("n=99"),
    )
  }

  // Scenario C — retry on 429 succeeds without fallback.
  mockApimart.setScript({
    kind: "fail-n-then-ok",
    failN: 2,
    status: 429,
    taskId: "t_retry",
    imageUrl: "https://mock.test/c.png",
  })
  mockApimart.resetCallCount()
  {
    const call = buildProviderCall("apimart", "nano-banana-2", async () => {
      const res = await fetch(`${mockApimart.url}/images/generations`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer mock" },
        body: JSON.stringify({ model: "nano-banana-2", prompt: "c" }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`apimart ${res.status} rate limit: ${text}`)
      }
      return await res.json()
    })
    const exec = await executeWithFallback(call, null, { baseDelayMs: 2, maxDelayMs: 5 })
    record(
      "C/wrapper: 429 × 2 → success on attempt 3, no fallback",
      exec.attempt === 3 && !exec.usedFallback && mockApimart.callCount() === 3,
      `attempt=${exec.attempt} calls=${mockApimart.callCount()}`,
    )
  }

  // Scenario D — primary 503 → fallback succeeds.
  mockApimart.setScript({ kind: "always-503" })
  mockPoyo.setScript({ kind: "ok", taskId: "poyo_task_d" })
  mockApimart.resetCallCount()
  mockPoyo.resetCallCount()
  {
    const primary = buildProviderCall("apimart", "nano-banana-2", async () => {
      const res = await fetch(`${mockApimart.url}/images/generations`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer mock" },
        body: JSON.stringify({ model: "nano-banana-2", prompt: "d" }),
      })
      if (!res.ok) throw new Error(`apimart ${res.status} temporarily unavailable`)
      return await res.json()
    })
    const fallback = buildProviderCall("poyo", "nano-banana-2", async () => {
      const res = await fetch(`${mockPoyo.url}/api/generate/submit`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer mock" },
        body: JSON.stringify({ model: "nano-banana-2", inputs: { prompt: "d" } }),
      })
      if (!res.ok) throw new Error(`poyo ${res.status}`)
      return await res.json()
    })
    const exec = await executeWithFallback(primary, fallback, { baseDelayMs: 2, maxDelayMs: 5 })
    record(
      "D/wrapper: primary 503 exhausted → fallback used, usedFallback=true",
      exec.usedFallback === true &&
        exec.provider === "poyo" &&
        mockApimart.callCount() === 3 &&
        mockPoyo.callCount() === 1,
      `primary=${mockApimart.callCount()} fallback=${mockPoyo.callCount()} provider=${exec.provider}`,
    )
  }

  // Scenario D-bis — primary 400 → fallback NOT triggered (Fix 4).
  mockApimart.setScript({ kind: "always-fail", status: 400, message: "bad request" })
  mockPoyo.setScript({ kind: "ok", taskId: "poyo_dbis" })
  mockApimart.resetCallCount()
  mockPoyo.resetCallCount()
  {
    const primary = buildProviderCall("apimart", "nano-banana-2", async () => {
      const res = await fetch(`${mockApimart.url}/images/generations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error(`apimart ${res.status} bad request`)
      return await res.json()
    })
    const fallback = buildProviderCall("poyo", "nano-banana-2", async () => {
      const res = await fetch(`${mockPoyo.url}/api/generate/submit`, { method: "POST", body: JSON.stringify({}) })
      if (!res.ok) throw new Error(`poyo ${res.status}`)
      return await res.json()
    })
    try {
      await executeWithFallback(primary, fallback, { baseDelayMs: 1, maxDelayMs: 2 })
      record("D-bis/wrapper: 400 on primary should NOT fall back", false)
    } catch (err: any) {
      record(
        "D-bis/wrapper: 400 on primary propagates, fallback skipped",
        mockApimart.callCount() === 1 && mockPoyo.callCount() === 0 && /400/.test(err.message),
        `primary=${mockApimart.callCount()} fallback=${mockPoyo.callCount()} err=${err.message}`,
      )
    }
  }

  // Scenario E — 2-step decision + step-1 submit flow (pure wrapper level).
  mockApimart.setScript({
    kind: "ok-task",
    taskId: "t_step1",
    pollStatus: "completed",
    imageUrl: "https://mock.test/reframed.png",
  })
  mockApimart.resetCallCount()
  {
    const decision = decideTwoStep(
      { referenceImageUrl: "https://mock.test/ref.png", targetAspectRatio: "16:9", referenceAspectRatio: "1:1" },
      { modelIgnoresArOnRef: true },
    )
    if (!decision.needed) {
      record("E/wrapper: decideTwoStep fires on AR mismatch", false, "expected needed:true")
    } else {
      // Simulate step 1: submit + poll
      const submitRes = await fetch(`${mockApimart.url}/images/generations`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer mock" },
        body: JSON.stringify({
          model: decision.stepOne.model,
          prompt: decision.stepOne.prompt,
          image_urls: ["https://mock.test/ref.png"],
          aspect_ratio: "16:9",
        }),
      })
      const submitJson = await submitRes.json()
      const submission = adaptApimartSubmission(submitJson, {
        provider: "apimart",
        model: decision.stepOne.model,
        request_id: "req_step1",
      })
      let reframedUrl: string | undefined
      if (submission.kind === "task" && submission.taskId) {
        const statusRes = await fetch(`${mockApimart.url}/tasks/${submission.taskId}`)
        const statusJson = await statusRes.json()
        const canonical = adaptApimartStatus(statusJson, {
          provider: "apimart",
          model: decision.stepOne.model,
          request_id: "req_step1",
        })
        if (canonical.status === "completed") reframedUrl = canonical.urls[0]
      }
      record(
        "E/wrapper: step-1 submit+poll yields reframed URL",
        reframedUrl === "https://mock.test/reframed.png",
        `url=${reframedUrl}`,
      )

      // Loop guard — second call with alreadyApplied=true short-circuits.
      const second = decideTwoStep(
        { referenceImageUrl: "https://mock.test/ref.png", targetAspectRatio: "16:9" },
        { modelIgnoresArOnRef: true, alreadyApplied: true },
      )
      record("E/wrapper: alreadyApplied=true short-circuits step-1", !second.needed)
    }
  }
}

// -------------------------------------------------------------------
// Phase 2 — Next.js route-level scenarios
// -------------------------------------------------------------------

async function waitForNext(baseUrl: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(baseUrl, { signal: AbortSignal.timeout(2000) })
      if (res.status < 500) return true
    } catch {}
    await wait(500)
  }
  return false
}

async function phase2(mockApimart: MockProvider, mockPoyo: MockProvider): Promise<ChildProcess | null> {
  console.log("\n=== Phase 2: route-level (Next.js dev + mocks) ===")

  const cwd = process.cwd()
  const port = 3100

  const nextProc = spawn("npx", ["next", "dev", "-p", String(port), "--hostname", "127.0.0.1"], {
    cwd,
    env: {
      ...process.env,
      APIMART_BASE_URL: mockApimart.url,
      POYO_BASE_URL: mockPoyo.url,
      APIMART_API_KEY: "mock-apimart-key",
      POYO_API_KEY: "mock-poyo-key",
      NODE_ENV: "development",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
  nextProc.stdout?.on("data", () => {})
  nextProc.stderr?.on("data", () => {})

  const baseUrl = `http://127.0.0.1:${port}`
  const ready = await waitForNext(baseUrl, 45_000)
  if (!ready) {
    record("Next.js dev ready", false, "timed out waiting for :3100")
    return nextProc
  }
  record("Next.js dev ready", true)

  // Scenario A/route: direct image generation through Next route → canonical shape.
  mockApimart.setScript({ kind: "ok-direct", imageUrl: "https://mock.test/route-a.png" })
  mockApimart.resetCallCount()
  {
    const { status, body } = await fetchJson(`${baseUrl}/api/apimart/images/generations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "nano-banana-2", prompt: "route test" }),
    })
    const adapted = adaptApimartSubmission(body, {
      provider: "apimart",
      model: "nano-banana-2",
      request_id: "req_route_a",
    })
    record(
      "A/route: /api/apimart/images/generations returns direct→canonical completed",
      status === 200 &&
        adapted.kind === "direct" &&
        adapted.canonical.status === "completed" &&
        adapted.canonical.urls[0] === "https://mock.test/route-a.png",
      `status=${status} kind=${adapted.kind}`,
    )
  }

  // Scenario B/route: character extract rejects missing imageUrl (server-side validation).
  {
    const { status, body } = await fetchJson(`${baseUrl}/api/apimart/character/extract`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })
    record(
      "B/route: character/extract without imageUrl → 400 + error",
      status === 400 && typeof body?.error === "string" && body.error.toLowerCase().includes("imageurl"),
      `status=${status} error=${body?.error}`,
    )
  }

  // Scenario A-bis/route: task-submission response → canonical task kind.
  mockApimart.setScript({
    kind: "ok-task",
    taskId: "route_task_1",
    pollStatus: "completed",
    imageUrl: "https://mock.test/route-poll.png",
  })
  mockApimart.resetCallCount()
  {
    const { status, body } = await fetchJson(`${baseUrl}/api/apimart/images/generations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "nano-banana-2", prompt: "task test" }),
    })
    const adapted = adaptApimartSubmission(body, {
      provider: "apimart",
      model: "nano-banana-2",
      request_id: "req_route_task",
    })
    record(
      "A-bis/route: task submission → canonical task kind with queued status",
      status === 200 && adapted.kind === "task" && adapted.taskId === "route_task_1" && adapted.canonical.status === "queued",
      `kind=${adapted.kind} taskId=${(adapted as any).taskId}`,
    )

    // Poll the task through the Next route
    const poll = await fetchJson(`${baseUrl}/api/apimart/tasks/${encodeURIComponent("route_task_1")}?language=en`)
    const canonical = adaptApimartStatus(poll.body, {
      provider: "apimart",
      model: "nano-banana-2",
      request_id: "req_route_task",
    })
    record(
      "A-bis/route: poll through /api/apimart/tasks/:id → canonical completed",
      poll.status === 200 && canonical.status === "completed" && canonical.urls[0] === "https://mock.test/route-poll.png",
      `status=${poll.status} canonical.status=${canonical.status}`,
    )
  }

  // Scenario E/route: character/extract full submit+poll via canonical adapters.
  mockApimart.setScript({
    kind: "ok-task",
    taskId: "route_extract",
    pollStatus: "completed",
    imageUrl: "https://mock.test/route-extract.png",
  })
  {
    const { status, body } = await fetchJson(`${baseUrl}/api/apimart/character/extract`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "https://mock.test/source.png" }),
    })
    record(
      "E/route: character/extract submits+polls through canonical path → extractedImageUrl",
      status === 200 &&
        body?.status === "completed" &&
        body?.extractedImageUrl === "https://mock.test/route-extract.png" &&
        typeof body?.request_id === "string" &&
        body.request_id.startsWith("req_"),
      `status=${status} extracted=${body?.extractedImageUrl} reqid=${body?.request_id}`,
    )
  }

  return nextProc
}

// -------------------------------------------------------------------
// Main
// -------------------------------------------------------------------

async function main() {
  const mockApimart = await startMockApimart({ kind: "ok-direct", imageUrl: "https://mock.test/init.png" })
  const mockPoyo = await startMockPoyo({ kind: "ok", taskId: "poyo-init" })
  console.log(`Mock ApiMart: ${mockApimart.url}`)
  console.log(`Mock Poyo:    ${mockPoyo.url}`)

  let nextProc: ChildProcess | null = null
  try {
    await phase1(mockApimart, mockPoyo)
    nextProc = await phase2(mockApimart, mockPoyo)
  } finally {
    if (nextProc) {
      nextProc.kill("SIGTERM")
      await wait(500)
      if (!nextProc.killed) nextProc.kill("SIGKILL")
    }
    await mockApimart.close()
    await mockPoyo.close()
  }

  console.log("\n=== Integration harness results ===")
  for (const r of results) {
    const icon = r.pass ? "✓" : "✘"
    console.log(`${icon} ${r.name}${r.note ? `  [${r.note}]` : ""}`)
  }
  console.log(`\n${passed}/${passed + failed} passed`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error("harness crashed:", err)
  process.exit(2)
})
