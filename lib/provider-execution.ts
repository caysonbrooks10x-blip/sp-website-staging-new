/**
 * Retry + backoff + provider fallback wrapper — Sprint A Step 4.
 *
 * Every provider call that reaches the network should be wrapped in
 * executeWithFallback so failures are handled consistently:
 *
 *   • 429 / 503 / timeout → retry up to 2x with exponential backoff + jitter
 *   • all other errors    → no retry, propagate immediately
 *   • primary exhausted   → switch to fallback plan (different provider,
 *                           same model id) when available, and retry there
 *   • final outcome       → stamps {attempt, used_fallback} on the result
 *                           so logs and the canonical response can report
 *                           which path actually succeeded
 *
 * Callers supply the provider-specific `submit` closures. This module
 * does not know anything about Poyo or ApiMart payload shapes.
 */

import { isRetryableProviderFailure, type ProviderFallbackPlan, type StudioProvider } from "@/lib/provider-routing"
import type { Logger } from "@/lib/logger"

/**
 * Cross-provider fallback policy (revised 2026-04-18).
 *
 * Original policy treated every 4xx as "caller's fault, don't retry on
 * fallback" — assuming both providers would reject the same payload.
 * That assumption is wrong for Poyo ↔ ApiMart: the providers have
 * different per-model param specs (e.g. Poyo's wan2.5 requires
 * `1280*720`; ApiMart accepts `16:9`). So a payload that 400s on Poyo
 * can succeed on ApiMart — and vice versa — purely because of shape
 * differences. 404 (model not in that provider's catalog) is also
 * legitimately recoverable via the alternate provider.
 *
 * We now attempt the fallback for any error. The fallback has its own
 * retry budget, and if it also fails, `executeWithFallback` returns
 * a combined error that surfaces both reasons. That's clearer than
 * silently eating the primary's 4xx.
 */
export function shouldAttemptFallback(_error: unknown): boolean {
  return true
}

export interface ExecuteOptions {
  maxRetries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  onAttempt?: (info: { provider: StudioProvider; attempt: number; usedFallback: boolean }) => void
  /**
   * Optional structured logger. When provided, the executor emits an
   * info event on each success (with duration_ms, attempt count, and
   * whether fallback was used) and a warn event on each retryable
   * failure before the backoff sleep. Final terminal failures are
   * left to the caller to log, since they have more context about
   * what the caller was trying to accomplish.
   */
  logger?: Logger
}

export interface ExecuteSuccess<T> {
  result: T
  provider: StudioProvider
  model: string
  attempt: number
  usedFallback: boolean
}

export interface ProviderCall<T> {
  provider: StudioProvider
  model: string
  submit: () => Promise<T>
}

const DEFAULT_MAX_RETRIES = 2
const DEFAULT_BASE_DELAY_MS = 450
const DEFAULT_MAX_DELAY_MS = 5_000

function jitter(ms: number) {
  return Math.floor(ms * (0.85 + Math.random() * 0.3))
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runWithRetry<T>(
  call: ProviderCall<T>,
  opts: ExecuteOptions,
  usedFallback: boolean,
): Promise<ExecuteSuccess<T>> {
  const maxRetries = Math.max(0, opts.maxRetries ?? DEFAULT_MAX_RETRIES)
  const baseDelay = opts.baseDelayMs ?? DEFAULT_BASE_DELAY_MS
  const maxDelay = opts.maxDelayMs ?? DEFAULT_MAX_DELAY_MS

  let lastError: unknown
  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    const attemptStart = Date.now()
    try {
      opts.onAttempt?.({ provider: call.provider, attempt, usedFallback })
      const result = await call.submit()
      opts.logger?.info("provider_call_success", {
        provider: call.provider,
        model: call.model,
        attempt,
        used_fallback: usedFallback,
        duration_ms: Date.now() - attemptStart,
      })
      return { result, provider: call.provider, model: call.model, attempt, usedFallback }
    } catch (error) {
      lastError = error
      const retryable = isRetryableProviderFailure(error)
      opts.logger?.warn("provider_call_failure", {
        provider: call.provider,
        model: call.model,
        attempt,
        used_fallback: usedFallback,
        retryable,
        duration_ms: Date.now() - attemptStart,
        error_message: error instanceof Error ? error.message : String(error),
      })
      if (attempt > maxRetries) break
      if (!retryable) break
      const delay = jitter(Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay))
      await sleep(delay)
    }
  }
  throw lastError
}

/**
 * Run `primary.submit`. If it exhausts its retries with a retryable
 * failure OR throws a non-retryable error that the fallback plan exists
 * for, retry on the fallback provider exactly once (with its own retry
 * budget).
 */
export async function executeWithFallback<T>(
  primary: ProviderCall<T>,
  fallback: ProviderCall<T> | null,
  opts: ExecuteOptions = {},
): Promise<ExecuteSuccess<T>> {
  try {
    return await runWithRetry(primary, opts, false)
  } catch (primaryError) {
    if (!fallback) throw primaryError
    if (!shouldAttemptFallback(primaryError)) throw primaryError
    try {
      return await runWithRetry(fallback, opts, true)
    } catch (fallbackError) {
      const combined = new Error(
        `Primary provider ${primary.provider}:${primary.model} failed (${
          primaryError instanceof Error ? primaryError.message : "unknown error"
        }); fallback ${fallback.provider}:${fallback.model} also failed (${
          fallbackError instanceof Error ? fallbackError.message : "unknown error"
        }).`,
      )
      ;(combined as any).primaryError = primaryError
      ;(combined as any).fallbackError = fallbackError
      throw combined
    }
  }
}

/**
 * Convenience builder when the caller has a `ProviderFallbackPlan`
 * (the structure returned by getProviderFallback / FALLBACK_MAP) and a
 * factory that constructs the submit closure for a given provider.
 */
export function buildProviderCall<T>(
  provider: StudioProvider,
  model: string,
  submit: () => Promise<T>,
): ProviderCall<T> {
  return { provider, model, submit }
}

export function buildFallbackCall<T>(
  plan: ProviderFallbackPlan | undefined,
  submitFactory: (provider: StudioProvider, model: string) => () => Promise<T>,
): ProviderCall<T> | null {
  if (!plan) return null
  return { provider: plan.provider, model: plan.model, submit: submitFactory(plan.provider, plan.model) }
}
