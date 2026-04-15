/**
 * Cost tracking — records the USD cost of every generation.
 *
 * Sprint B · Phase 2 · #6 from final_fixes.pdf. Model definitions
 * already carry cost formulas (model-config.ts `getCost`); this module
 * owns the RECORDING side — attaching an immutable cost record to each
 * generation session so billing, leak detection, and usage analytics
 * have a single source of truth.
 *
 * Design:
 *   - Writes go through a sink. The default sink writes to Firestore
 *     when Firebase Admin is configured, and falls back to a structured
 *     log line otherwise (visible in Vercel runtime logs).
 *   - Sink is swappable via `setCostSink()` — tests use an in-memory
 *     sink; future batch/analytics pipelines can swap in their own.
 *   - Every record carries a stable `generation_id`. Callers should
 *     pass one (typically the request_id from provider-response.ts).
 *   - Never throws into the caller. Cost-recording failures are logged
 *     to the structured logger and swallowed.
 */

import type { StudioProvider } from "./provider-routing"
import { logger } from "./logger"

export interface CostRecord {
  /** Stable, caller-provided id. Usually the provider request_id. */
  generation_id: string
  /** Firebase uid if authenticated; "anonymous" for pre-login flows. */
  user_id: string
  /** Session/job id if the caller groups multiple generations. */
  session_id?: string
  provider: StudioProvider
  model: string
  cost_usd: number
  /** "completed" for successful generations, "failed" for charged failures,
   *  "partial" for step-1 of a 2-step that never reached step-2, etc. */
  status: "completed" | "failed" | "partial"
  /** When the generation was recorded. ISO 8601. */
  timestamp: string
  /** Arbitrary caller-attached context (prompt hash, aspect ratio, etc.). */
  meta?: Record<string, unknown>
}

export type CostSink = (record: CostRecord) => Promise<void> | void

/**
 * Default sink: Firestore if admin is initialized, otherwise log-only.
 * Falling back to log is intentional — a local dev without Firebase
 * admin creds should still exercise the cost-recording path without
 * crashing the generation flow.
 */
const defaultSink: CostSink = async (record) => {
  try {
    const { getAdminDb } = await import("./firebase-admin")
    const db = getAdminDb()
    await db.collection("generations").doc(record.generation_id).set(record, { merge: false })
  } catch (err) {
    // Firebase admin not configured (or write failed) — log the record
    // so it's still visible in the runtime logs and not silently lost.
    logger.warn("cost_record_fallback_to_log", {
      reason: err instanceof Error ? err.message : "unknown",
      record,
    })
  }
}

let activeSink: CostSink = defaultSink

export function setCostSink(sink: CostSink | null): void {
  activeSink = sink ?? defaultSink
}

/**
 * Record the cost of a generation. Never throws.
 */
export async function recordGenerationCost(
  input: Omit<CostRecord, "timestamp">,
): Promise<void> {
  const record: CostRecord = {
    ...input,
    timestamp: new Date().toISOString(),
  }
  try {
    await activeSink(record)
    logger.info("cost_recorded", {
      generation_id: record.generation_id,
      user_id: record.user_id,
      provider: record.provider,
      model: record.model,
      cost_usd: record.cost_usd,
      status: record.status,
    })
  } catch (err) {
    // The default sink already catches Firestore errors internally; a
    // throw here means a custom sink misbehaved. Log and drop.
    logger.error("cost_record_failed", err, {
      generation_id: record.generation_id,
    })
  }
}

/**
 * Convenience helper: compute the cost from a model config + params,
 * then record it. Keeps call sites from duplicating the `getCost`
 * dispatch + the timestamp plumbing.
 */
export interface ModelCostSource {
  id: string
  baseCost: number
  getCost?: (params: Record<string, unknown>) => number
}

export function computeCost(model: ModelCostSource, params: Record<string, unknown> = {}): number {
  if (typeof model.getCost === "function") {
    const c = model.getCost(params)
    if (typeof c === "number" && Number.isFinite(c) && c >= 0) return c
  }
  return Number.isFinite(model.baseCost) && model.baseCost >= 0 ? model.baseCost : 0
}
