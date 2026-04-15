/**
 * Offline smoke for lib/rate-limit.ts.
 *
 * Uses the default in-memory store + a configurable "now" injected via
 * a custom store so we don't have to sleep for real.
 *
 * Run: npx tsx scripts/verify-rate-limit.ts
 */

import {
  checkRateLimit,
  rateLimitKeyForRequest,
  resetInMemoryRateLimit,
  setRateLimitStore,
  type BucketState,
  type ConsumeOutcome,
  type RateLimitStore,
} from "../lib/rate-limit"
import { setSink } from "../lib/logger"

setSink(() => undefined)

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

/**
 * Deterministic test store: advances `now` explicitly so we don't
 * depend on wall-clock jitter.
 */
function makeTestStore(): { store: RateLimitStore; advance: (ms: number) => void; setNow: (ms: number) => void } {
  let currentNow = 1_000_000
  const data = new Map<string, BucketState>()
  return {
    store: {
      async apply(key, mutator) {
        const outcome = mutator(data.get(key) ?? null, currentNow)
        data.set(key, outcome.state)
        return outcome as ConsumeOutcome
      },
    },
    advance(ms) {
      currentNow += ms
    },
    setNow(ms) {
      currentNow = ms
    },
  }
}

async function main() {
  // ============================================================
  // Core bucket semantics
  // ============================================================
  const t1 = makeTestStore()
  setRateLimitStore(t1.store)
  const cfg = { capacity: 3, refillPerSecond: 1 } // 1 token/sec, cap 3

  // 3 fresh consumes succeed
  const r1 = await checkRateLimit("user:a", cfg)
  const r2 = await checkRateLimit("user:a", cfg)
  const r3 = await checkRateLimit("user:a", cfg)
  check("burst: 3 of 3 succeed from full bucket", r1.ok && r2.ok && r3.ok)
  check("burst: remaining decrements", r1.remaining === 2 && r2.remaining === 1 && r3.remaining === 0)

  // 4th is throttled
  const r4 = await checkRateLimit("user:a", cfg)
  check("burst: 4th throttled", !r4.ok)
  check("burst: retryAfterSeconds >= 1", r4.retryAfterSeconds >= 1)
  check("burst: resetAt is a valid ISO date", !Number.isNaN(Date.parse(r4.resetAt)))

  // Advance 1 second → 1 token refilled, 5th succeeds
  t1.advance(1_000)
  const r5 = await checkRateLimit("user:a", cfg)
  check("refill: 1 sec → 1 token → 5th succeeds", r5.ok)

  // Advance 10 seconds → bucket refills to cap (not beyond)
  t1.advance(10_000)
  const r6 = await checkRateLimit("user:a", cfg)
  const r7 = await checkRateLimit("user:a", cfg)
  const r8 = await checkRateLimit("user:a", cfg)
  const r9 = await checkRateLimit("user:a", cfg)
  check("refill: cap enforced — 3 succeed after long idle", r6.ok && r7.ok && r8.ok)
  check("refill: 4th after idle is throttled", !r9.ok)

  // ============================================================
  // Keys are isolated
  // ============================================================
  const t2 = makeTestStore()
  setRateLimitStore(t2.store)
  const cfg2 = { capacity: 1, refillPerSecond: 1 }
  const a1 = await checkRateLimit("user:a", cfg2)
  const b1 = await checkRateLimit("user:b", cfg2)
  const a2 = await checkRateLimit("user:a", cfg2)
  check("isolation: a=ok, b=ok, a-again=throttled", a1.ok && b1.ok && !a2.ok)

  // ============================================================
  // Empty key short-circuits (no-op limiter)
  // ============================================================
  const t3 = makeTestStore()
  setRateLimitStore(t3.store)
  const empty = await checkRateLimit("", { capacity: 1, refillPerSecond: 1 })
  check("empty key: allows and does not consume", empty.ok)

  // ============================================================
  // Misconfiguration → fail-open with warning
  // ============================================================
  const t4 = makeTestStore()
  setRateLimitStore(t4.store)
  const bad = await checkRateLimit("user:x", { capacity: 0, refillPerSecond: 0 })
  check("misconfig: cap=0 fails open", bad.ok)

  // ============================================================
  // Storage error → fail-open
  // ============================================================
  setRateLimitStore({
    async apply() {
      throw new Error("backend down")
    },
  })
  const storeErr = await checkRateLimit("user:x", { capacity: 10, refillPerSecond: 1 })
  check("store error: fails open", storeErr.ok)

  // ============================================================
  // rateLimitKeyForRequest
  // ============================================================
  check("key: uid preferred", rateLimitKeyForRequest({ userId: "u_1", forwardedFor: "1.2.3.4" }) === "user:u_1")
  check(
    "key: ip fallback when no uid",
    rateLimitKeyForRequest({ userId: null, forwardedFor: "1.2.3.4, 10.0.0.1", realIp: "5.6.7.8" }) === "ip:1.2.3.4",
  )
  check("key: realIp fallback when no forwarded-for", rateLimitKeyForRequest({ realIp: "9.9.9.9" }) === "ip:9.9.9.9")
  check("key: empty when nothing available", rateLimitKeyForRequest({}) === "")

  // ============================================================
  // Restore default store for subsequent test files
  // ============================================================
  setRateLimitStore(null)
  resetInMemoryRateLimit()
  setSink(null)

  console.log(`\n${passed}/${passed + failed} passed`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error("smoke crashed:", err)
  process.exit(2)
})
