/**
 * Canonical provider response shape — Sprint A Step 1.
 *
 * Every provider call (Poyo + ApiMart, submit + poll) MUST be funneled
 * through one of the adapters in this file before reaching any consumer.
 * Consumers (UI, polling, logging) read only this shape — they never
 * touch raw provider JSON.
 *
 * Why: previously each call site did its own field-mashing
 * (`task?.data?.result?.images?.[0]?.url?.[0]` etc.). Switching providers
 * changed UI behavior because the shapes differed. This file collapses
 * that down to one type.
 */

import type { ApiMartTaskStatusResponse, ApiMartSubmissionResponse, ApiMartDirectImageResponse } from "@/lib/apimart"
import type { PoyoTaskStatusResponse, PoyoSubmitResponse } from "@/lib/poyo"

export type CanonicalStatus = "queued" | "running" | "completed" | "failed"

export interface CanonicalJobStatus {
  status: CanonicalStatus
  progress: number
  urls: string[]
  error: string | null
  provider: string
  model: string
  request_id: string
  attempt: number
  used_fallback: boolean
  thumbnail_url?: string
}

export interface AdapterContext {
  provider: string
  model: string
  request_id: string
  attempt?: number
  used_fallback?: boolean
}

function safeProgress(value: unknown, status: CanonicalStatus): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value <= 1 && value >= 0) return Math.round(value * 100)
    return Math.max(0, Math.min(100, Math.round(value)))
  }
  if (status === "completed") return 100
  if (status === "running") return 50
  if (status === "queued") return 5
  return 0
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function asUrlArray(value: unknown): string[] {
  if (!value) return []
  if (typeof value === "string") return value.length > 0 ? [value] : []
  if (Array.isArray(value)) {
    const out: string[] = []
    for (const item of value) {
      if (typeof item === "string" && item.length > 0) out.push(item)
      else if (item && typeof item === "object") {
        const url = (item as any).url
        if (typeof url === "string" && url.length > 0) out.push(url)
        else if (Array.isArray(url)) {
          for (const u of url) {
            if (typeof u === "string" && u.length > 0) out.push(u)
          }
        }
      }
    }
    return out
  }
  return []
}

function withDefaults(partial: Partial<CanonicalJobStatus>, ctx: AdapterContext): CanonicalJobStatus {
  return {
    status: partial.status ?? "queued",
    progress: partial.progress ?? 0,
    urls: partial.urls ?? [],
    error: partial.error ?? null,
    provider: ctx.provider,
    model: ctx.model,
    request_id: ctx.request_id,
    attempt: ctx.attempt ?? 1,
    used_fallback: ctx.used_fallback ?? false,
    thumbnail_url: partial.thumbnail_url,
  }
}

// -------------------------------------------------------------------
// ApiMart adapters
// -------------------------------------------------------------------

const APIMART_TERMINAL_OK = new Set(["completed", "succeeded", "success"])
const APIMART_TERMINAL_FAIL = new Set(["failed", "cancelled", "canceled", "error"])
const APIMART_RUNNING = new Set(["processing", "running", "in_progress"])
const APIMART_QUEUED = new Set(["pending", "queued", "waiting"])

function mapApimartStatus(raw: unknown): CanonicalStatus {
  const s = typeof raw === "string" ? raw.toLowerCase() : ""
  if (APIMART_TERMINAL_OK.has(s)) return "completed"
  if (APIMART_TERMINAL_FAIL.has(s)) return "failed"
  if (APIMART_RUNNING.has(s)) return "running"
  if (APIMART_QUEUED.has(s)) return "queued"
  return "running"
}

export function adaptApimartStatus(payload: unknown, ctx: AdapterContext): CanonicalJobStatus {
  const root = payload as Partial<ApiMartTaskStatusResponse> | null | undefined
  const task = (root?.data ?? {}) as ApiMartTaskStatusResponse["data"] | Record<string, never>
  const status = mapApimartStatus((task as any)?.status)

  const imageUrls = asUrlArray((task as any)?.result?.images)
  const videoEntries = Array.isArray((task as any)?.result?.videos) ? (task as any).result.videos : []
  const videoUrls = videoEntries
    .map((v: any) => v?.url)
    .filter((u: unknown): u is string => typeof u === "string" && u.length > 0)
  const directUrls = asUrlArray((task as any)?.result?.url)
  const urls = Array.from(new Set([...imageUrls, ...videoUrls, ...directUrls]))

  const errorMessage =
    asNonEmptyString((task as any)?.error?.message) ||
    asNonEmptyString((task as any)?.error?.type) ||
    (status === "failed" ? "Provider returned a failed task with no error message." : null)

  return withDefaults(
    {
      status,
      progress: safeProgress((task as any)?.progress, status),
      urls,
      error: errorMessage ?? null,
      thumbnail_url:
        asNonEmptyString(videoEntries[0]?.thumbnail_url) ||
        asNonEmptyString((task as any)?.result?.thumbnail_url),
    },
    ctx,
  )
}

/**
 * ApiMart's `/v1/images/generations` can return either a polled task or a
 * direct synchronous image response. This adapter handles both.
 */
export function adaptApimartSubmission(
  payload: ApiMartSubmissionResponse | ApiMartDirectImageResponse | unknown,
  ctx: AdapterContext,
): { kind: "task"; taskId: string; canonical: CanonicalJobStatus } | { kind: "direct"; canonical: CanonicalJobStatus } {
  if (payload && typeof payload === "object") {
    const data = (payload as any).data
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0]
      // Direct image response (b64 or url, no task_id).
      if ((first?.b64_json || first?.url) && !first?.task_id) {
        const urls = data
          .map((d: any) => d?.url)
          .filter((u: unknown): u is string => typeof u === "string" && u.length > 0)
        return {
          kind: "direct",
          canonical: withDefaults({ status: "completed", progress: 100, urls }, ctx),
        }
      }
      // Task submission.
      if (first?.task_id) {
        return {
          kind: "task",
          taskId: String(first.task_id),
          canonical: withDefaults({ status: "queued", progress: 5 }, ctx),
        }
      }
    }
  }
  return {
    kind: "task",
    taskId: "",
    canonical: withDefaults(
      { status: "failed", error: "ApiMart submission returned no task_id and no direct payload." },
      ctx,
    ),
  }
}

// -------------------------------------------------------------------
// Poyo adapters
// -------------------------------------------------------------------

function mapPoyoState(raw: unknown): CanonicalStatus {
  const s = typeof raw === "string" ? raw.toLowerCase() : ""
  if (s === "completed" || s === "success" || s === "succeeded") return "completed"
  if (s === "failed" || s === "cancelled" || s === "canceled" || s === "error") return "failed"
  if (s === "processing" || s === "running") return "running"
  if (s === "queued" || s === "pending" || s === "waiting") return "queued"
  return "running"
}

export function adaptPoyoStatus(payload: unknown, ctx: AdapterContext): CanonicalJobStatus {
  const data = (payload as Partial<PoyoTaskStatusResponse>) ?? {}
  const status = mapPoyoState((data as any).state)
  const outputs = Array.isArray((data as any).outputs) ? (data as any).outputs : []
  const urls: string[] = []
  let thumbnail: string | undefined
  for (const asset of outputs) {
    const u = asNonEmptyString(asset?.url)
    if (u) urls.push(u)
    if (!thumbnail) thumbnail = asNonEmptyString(asset?.thumbnail_url)
  }
  const errorMessage =
    asNonEmptyString((data as any).error?.message) ||
    (status === "failed" ? "Provider returned a failed task with no error message." : null)

  return withDefaults(
    {
      status,
      progress: safeProgress((data as any).progress, status),
      urls,
      error: errorMessage ?? null,
      thumbnail_url: thumbnail,
    },
    ctx,
  )
}

export function adaptPoyoSubmission(
  payload: PoyoSubmitResponse | unknown,
  ctx: AdapterContext,
): { taskId: string; canonical: CanonicalJobStatus } {
  const data = payload as Partial<PoyoSubmitResponse> | undefined
  const taskId = asNonEmptyString(data?.task_id) ?? ""
  return {
    taskId,
    canonical: withDefaults(
      taskId
        ? { status: "queued", progress: 5 }
        : { status: "failed", error: "Poyo submission returned no task_id." },
      ctx,
    ),
  }
}

// -------------------------------------------------------------------
// Provider-agnostic helpers used by polling/retry/UI
// -------------------------------------------------------------------

export function isTerminal(status: CanonicalStatus): boolean {
  return status === "completed" || status === "failed"
}

export function newRequestId(): string {
  // Stable, sortable, no extra deps. Sufficient for log correlation.
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 10)
  return `req_${ts}_${rand}`
}

/**
 * Build a CanonicalJobStatus directly for failure cases the adapter never
 * sees (network errors before the provider responds, validation failures).
 */
export function canonicalFailure(message: string, ctx: AdapterContext): CanonicalJobStatus {
  return withDefaults({ status: "failed", error: message }, ctx)
}
