/**
 * Offline smoke test for lib/logger.ts.
 *
 * Exercises the structured logger, context propagation, error
 * serialisation, the timer closure, and the provider-execution
 * log hook. Uses setSink to capture events in memory.
 *
 * Run: npx tsx scripts/verify-logger.ts
 */

import { createLogger, setSink, type LogEvent } from "../lib/logger"
import { executeWithFallback, buildProviderCall } from "../lib/provider-execution"

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

const events: LogEvent[] = []
setSink((event) => events.push(event))
function reset() {
  events.length = 0
}

// -- basic levels --------------------------------------------------------

{
  reset()
  const log = createLogger({ request_id: "req_abc" })
  log.info("hello", { route: "/x" })
  check("info: single event emitted", events.length === 1)
  const e = events[0]
  check("info: level attached", e.level === "info")
  check("info: message attached", e.message === "hello")
  check("info: request_id inherited from context", e.request_id === "req_abc")
  check("info: extra merged", e.route === "/x")
  check("info: timestamp is ISO 8601", typeof e.timestamp === "string" && !Number.isNaN(Date.parse(e.timestamp)))
}

// -- debug suppression in production ------------------------------------

{
  reset()
  const saved = process.env.NODE_ENV
  const envBag = process.env as Record<string, string | undefined>
  envBag.NODE_ENV = "production"
  try {
    const log = createLogger()
    log.debug("should not appear")
    check("debug: suppressed in production", events.length === 0)
  } finally {
    if (saved === undefined) delete envBag.NODE_ENV
    else envBag.NODE_ENV = saved
  }
}

// -- withContext layering -----------------------------------------------

{
  reset()
  const base = createLogger({ request_id: "req_1", route: "/api/x" })
  const scoped = base.withContext({ provider: "apimart", model: "nano-banana-2" })
  scoped.info("scoped event")
  const e = events[0]
  check("withContext: base context preserved", e.request_id === "req_1" && e.route === "/api/x")
  check("withContext: layered context attached", e.provider === "apimart" && e.model === "nano-banana-2")
  check("withContext: base logger unchanged", base !== scoped)
}

// -- error serialisation ------------------------------------------------

{
  reset()
  const log = createLogger()
  log.error("boom", new Error("upstream fell over"))
  const e = events[0]
  check("error: level attached", e.level === "error")
  check(
    "error: Error object serialised to .error field",
    e.error?.name === "Error" && e.error.message === "upstream fell over" && typeof e.error.stack === "string",
  )
}

// -- timer closure ------------------------------------------------------

{
  reset()
  const log = createLogger({ request_id: "req_t" })
  const end = log.startTimer()
  // Busy-wait a hair so duration > 0.
  const until = Date.now() + 5
  while (Date.now() < until) {
    // intentional
  }
  end("elapsed", { route: "/timer" })
  const e = events[0]
  check("timer: fires on end()", events.length === 1)
  check("timer: duration_ms present and >= 5", typeof e.duration_ms === "number" && e.duration_ms! >= 5)
  check("timer: context preserved", e.request_id === "req_t" && e.route === "/timer")
}

// -- sink never throws into caller --------------------------------------

{
  reset()
  setSink(() => {
    throw new Error("sink exploded")
  })
  const log = createLogger()
  let threw = false
  try {
    log.info("hi")
  } catch {
    threw = true
  }
  check("sink: never throws into caller", threw === false)
  setSink((event) => events.push(event))
}

async function asyncChecks() {
  // -- executeWithFallback wiring --------------------------------------
  {
    reset()
    const log = createLogger({ request_id: "req_exec" })
    let calls = 0
    const primary = buildProviderCall("apimart" as const, "nano-banana-2", async () => {
      calls += 1
      return { ok: true, n: calls }
    })
    const out = await executeWithFallback(primary, null, { logger: log, baseDelayMs: 1, maxDelayMs: 2 })
    check("exec: submit called once on success", calls === 1)
    check("exec: result returned", (out.result as { ok: boolean }).ok === true)
    check("exec: emits a success log event", events.some((e) => e.message === "provider_call_success"))
    const successEvent = events.find((e) => e.message === "provider_call_success")!
    check(
      "exec: success log has provider + model + attempt",
      successEvent.provider === "apimart" && successEvent.model === "nano-banana-2" && successEvent.attempt === 1,
    )
    check("exec: success log has duration_ms", typeof successEvent.duration_ms === "number")
    check("exec: success log inherits request_id", successEvent.request_id === "req_exec")
  }

  // -- executeWithFallback logs retryable failure before retry ---------
  {
    reset()
    const log = createLogger()
    let calls = 0
    const primary = buildProviderCall("apimart" as const, "nano-banana-2", async () => {
      calls += 1
      if (calls < 3) {
        const err = new Error("apimart 429 rate_limited") as Error & { status?: number }
        err.status = 429
        throw err
      }
      return { ok: true }
    })
    await executeWithFallback(primary, null, { logger: log, baseDelayMs: 1, maxDelayMs: 2 })
    const failures = events.filter((e) => e.message === "provider_call_failure")
    check("exec: emits one failure event per retryable failure", failures.length === 2)
    check("exec: failure event marks retryable=true", failures.every((e) => e.retryable === true))
    check(
      "exec: success event emitted after retries",
      events.some((e) => e.message === "provider_call_success" && e.attempt === 3),
    )
  }
}

asyncChecks()
  .catch((err) => {
    console.error("async checks crashed:", err)
    process.exit(2)
  })
  .then(() => {
    setSink(null)
    console.log(`\n${passed}/${passed + failed} passed`)
    if (failed > 0) process.exit(1)
  })
