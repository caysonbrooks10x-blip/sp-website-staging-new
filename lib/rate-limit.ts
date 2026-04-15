/**
 * Token-bucket rate limiter with swappable storage.
 *
 * Sprint B · Phase 4 · #13 from final_fixes.pdf — per-user limits +
 * request throttling to prevent abuse and control cost spikes.
 *
 * Algorithm:
 *   Each `key` (user uid, IP, API key, etc.) owns a bucket of
 *   `capacity` tokens. Every request consumes 1 token. The bucket
 *   refills at `refillPerSecond` tokens/sec, capped at capacity.
 *   When tokens < 1, the request is rejected and retryAfterSeconds
 *   reports when the next token becomes available.
 *
 * Storage:
 *   Default: in-memory (fine for a single-process local dev; useless
 *   for serverless where each lambda is a separate process). Call
 *   setRateLimitStore() at boot to swap in a durable store (Firestore,
 *   Upstash Redis, Vercel KV, etc.). The core library has zero
 *   backend dep so a missing store doesn't crash the API.
 *
 * Never throws into the caller. Storage failures fail-open (allow the
 * request) and emit a structured log warning — a rate limiter that
 * crashes requests is worse than one that occasionally under-counts.
 */

import { logger } from "./logger"

export interface RateLimitConfig {
  capacity: number
  refillPerSecond: number
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  capacity: number
  retryAfterSeconds: number
  resetAt: string
}

export interface BucketState {
  tokens: number
  updatedAt: number
}

/** Result of a single consume attempt. */
export interface ConsumeOutcome {
  state: BucketState
  consumed: boolean
}

export interface RateLimitStore {
  /**
   * Atomically read the bucket, run the mutator, write back, return the
   * outcome. Durable implementations must use a transaction — two
   * concurrent callers for the same key must not both see 1 token
   * available and both consume it.
   */
  apply(key: string, mutator: (current: BucketState | null, now: number) => ConsumeOutcome): Promise<ConsumeOutcome>
}

const inMemory = new Map<string, BucketState>()

const inMemoryStore: RateLimitStore = {
  async apply(key, mutator) {
    const now = Date.now()
    const current = inMemory.get(key) ?? null
    const outcome = mutator(current, now)
    inMemory.set(key, outcome.state)
    return outcome
  },
}

let activeStore: RateLimitStore = inMemoryStore

export function setRateLimitStore(store: RateLimitStore | null): void {
  activeStore = store ?? inMemoryStore
}

/** Test helper — reset the in-memory store. */
export function resetInMemoryRateLimit(): void {
  inMemory.clear()
}

function makeMutator(config: RateLimitConfig) {
  return (current: BucketState | null, now: number): ConsumeOutcome => {
    const prev = current ?? { tokens: config.capacity, updatedAt: now }
    const elapsedSec = Math.max(0, (now - prev.updatedAt) / 1000)
    const refilled = Math.min(config.capacity, prev.tokens + elapsedSec * config.refillPerSecond)
    if (refilled >= 1) {
      return { state: { tokens: refilled - 1, updatedAt: now }, consumed: true }
    }
    return { state: { tokens: refilled, updatedAt: now }, consumed: false }
  }
}

/**
 * Check + consume 1 token for `key`. Returns { ok: true } if allowed,
 * { ok: false, retryAfterSeconds } if throttled.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  if (!key) {
    return allow(config, config.capacity)
  }
  if (config.capacity <= 0 || config.refillPerSecond <= 0) {
    logger.warn("rate_limit_misconfigured", {
      key,
      capacity: config.capacity,
      refill: config.refillPerSecond,
    })
    return allow(config, config.capacity)
  }

  try {
    const outcome = await activeStore.apply(key, makeMutator(config))
    if (outcome.consumed) {
      return {
        ok: true,
        remaining: Math.floor(outcome.state.tokens),
        capacity: config.capacity,
        retryAfterSeconds: 0,
        resetAt: new Date(outcome.state.updatedAt).toISOString(),
      }
    }
    const retryAfterSeconds = Math.max(
      0.001,
      (1 - outcome.state.tokens) / config.refillPerSecond,
    )
    return {
      ok: false,
      remaining: 0,
      capacity: config.capacity,
      retryAfterSeconds: Math.ceil(retryAfterSeconds),
      resetAt: new Date(outcome.state.updatedAt + retryAfterSeconds * 1000).toISOString(),
    }
  } catch (err) {
    logger.warn("rate_limit_store_error_fail_open", {
      key,
      reason: err instanceof Error ? err.message : "unknown",
    })
    return allow(config, config.capacity - 1)
  }
}

function allow(config: RateLimitConfig, remaining: number): RateLimitResult {
  return {
    ok: true,
    remaining: Math.max(0, remaining),
    capacity: config.capacity,
    retryAfterSeconds: 0,
    resetAt: new Date().toISOString(),
  }
}

/** Generation endpoints — real $ per request. 20/min sustained. */
export const GENERATION_LIMIT: RateLimitConfig = {
  capacity: 20,
  refillPerSecond: 20 / 60,
}

/** Read endpoints — cheap, 60/min sustained. */
export const READ_LIMIT: RateLimitConfig = {
  capacity: 60,
  refillPerSecond: 1,
}

/**
 * Helper to derive a rate-limit key for an HTTP request. Prefers the
 * authenticated user id; falls back to client IP; as a last resort,
 * returns empty string (which short-circuits the limiter — allowing
 * the request and logging via checkRateLimit's early-return branch
 * is the least surprising default).
 */
export function rateLimitKeyForRequest(opts: {
  userId?: string | null
  forwardedFor?: string | null
  realIp?: string | null
}): string {
  if (opts.userId) return `user:${opts.userId}`
  const ipHeader = opts.forwardedFor ?? opts.realIp ?? ""
  const ip = ipHeader.split(",")[0]?.trim()
  if (ip) return `ip:${ip}`
  return ""
}
