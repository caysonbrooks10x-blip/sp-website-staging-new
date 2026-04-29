/**
 * Fal.ai client — queue-based async generation API.
 *
 * Fal exposes per-model endpoints under https://queue.fal.run/{app_id}.
 * Submit returns a `request_id` that we treat as the StudioX `task_id`.
 * Status / result endpoints sit under
 *   /{app_id}/requests/{request_id}/status
 *   /{app_id}/requests/{request_id}
 *
 * Auth is `Authorization: Key {FAL_API_KEY}` — the key format is
 * `key_id:secret`, sent verbatim.
 *
 * Catalog (verified 2026-04-28):
 *   IMAGE   → fal-ai/nano-banana, fal-ai/flux-pro/v1.1, fal-ai/flux-pro/v1.1-ultra,
 *             fal-ai/flux/dev, fal-ai/flux-kontext/pro/text-to-image,
 *             fal-ai/bytedance/seedream/v4/text-to-image, fal-ai/qwen-image,
 *             fal-ai/wan/v2.7-image-pro/text-to-image, fal-ai/kling/v3/text-to-image,
 *             fal-ai/gpt-image-1
 *   VIDEO   → fal-ai/bytedance/seedance/v2/pro/{text,image}-to-video,
 *             fal-ai/kling-video/v3/master/text-to-video,
 *             fal-ai/minimax/hailuo-2.3/text-to-video,
 *             fal-ai/wan/v2.6/text-to-video, fal-ai/sora-2
 *
 * Models NOT on Fal (as of 2026-04-28 probe): gpt-4o-image, veo3.1-*,
 * runway-gen-4.5, grok-* — these intentionally have no Fal fallback.
 */

const FAL_QUEUE_BASE = "https://queue.fal.run"

export class FalRequestError extends Error {
  status?: number
  code?: string
  retriable?: boolean
  body?: unknown
  constructor(message: string, init: { status?: number; code?: string; retriable?: boolean; body?: unknown } = {}) {
    super(message)
    this.name = "FalRequestError"
    this.status = init.status
    this.code = init.code
    this.retriable = init.retriable
    this.body = init.body
  }
}

export interface FalSubmitResponse {
  request_id: string
  // Path between queue.fal.run/ and /requests/{id} that Fal returned for
  // this submission (e.g. "fal-ai/bytedance"). Used by status/result polls
  // because Fal groups lookups by vendor prefix, not full app path.
  queue_base: string
  status?: string
  response_url?: string
  status_url?: string
  cancel_url?: string
  raw: unknown
}

function extractQueueBase(statusUrl: string | undefined, fallbackAppId: string): string {
  // Fal status_url shape: https://queue.fal.run/{queue_base}/requests/{id}/status
  if (statusUrl) {
    const m = statusUrl.match(/queue\.fal\.run\/(.+?)\/requests\//)
    if (m && m[1]) return m[1]
  }
  // Fallback: vendor prefix is the first 2 path segments of the app id
  // (e.g. "fal-ai/bytedance"). Single-segment apps just use as-is.
  const parts = fallbackAppId.split("/").filter(Boolean)
  if (parts.length >= 2) return `${parts[0]}/${parts[1]}`
  return fallbackAppId
}

export interface FalQueueStatus {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | string
  queue_position?: number
  logs?: Array<{ message?: string; timestamp?: string }>
  request_id?: string
  raw: unknown
}

export interface FalResult {
  // Generic shape — Fal models vary in output keys.
  // Image models commonly return { images: [{ url, content_type, width?, height? }] }.
  // Video models commonly return { video: { url } } or { videos: [...] }.
  images?: Array<{ url?: string; content_type?: string; width?: number; height?: number }>
  image?: { url?: string; content_type?: string }
  video?: { url?: string; content_type?: string }
  videos?: Array<{ url?: string; content_type?: string }>
  output?: unknown
  raw: unknown
}

function getKey(): string {
  const k = process.env.FAL_API_KEY
  if (!k) throw new FalRequestError("FAL_API_KEY env var is not set", { code: "FAL_KEY_MISSING" })
  return k
}

async function falFetch(
  path: string,
  init: RequestInit & { method: "POST" | "GET" } = { method: "GET" },
): Promise<{ status: number; body: unknown }> {
  const key = getKey()
  const headers: Record<string, string> = {
    Authorization: `Key ${key}`,
    Accept: "application/json",
  }
  if (init.body) headers["content-type"] = "application/json"
  Object.assign(headers, init.headers || {})

  const resp = await fetch(`${FAL_QUEUE_BASE}${path}`, { ...init, headers, cache: "no-store" })
  const text = await resp.text()
  let body: unknown = text
  try {
    body = text.length > 0 ? JSON.parse(text) : null
  } catch {
    // Keep raw text in body when not JSON.
  }
  return { status: resp.status, body }
}

function classifyFalError(status: number, body: unknown): FalRequestError {
  const message =
    (typeof body === "object" && body && "detail" in body && typeof (body as any).detail === "string"
      ? (body as any).detail
      : null) ||
    (typeof body === "object" && body && "message" in body && typeof (body as any).message === "string"
      ? (body as any).message
      : null) ||
    `Fal request failed (${status})`

  return new FalRequestError(message, {
    status,
    retriable: status === 429 || status >= 500,
    body,
  })
}

/**
 * Submit a generation request to a Fal model endpoint.
 *
 * @param appId   Fal app id, e.g. "fal-ai/bytedance/seedance/v2/pro/text-to-video"
 * @param input   Per-model input payload (Fal expects flat keys at the top level)
 */
export async function submitFalGeneration(
  appId: string,
  input: Record<string, unknown>,
): Promise<FalSubmitResponse> {
  const { status, body } = await falFetch(`/${appId}`, {
    method: "POST",
    body: JSON.stringify(input),
  })
  if (status < 200 || status >= 300) {
    throw classifyFalError(status, body)
  }
  const b = (body || {}) as Record<string, unknown>
  const requestId = typeof b.request_id === "string" ? b.request_id : undefined
  if (!requestId) {
    throw new FalRequestError("Fal submit response had no request_id", { status, body })
  }
  const statusUrl = typeof b.status_url === "string" ? b.status_url : undefined
  return {
    request_id: requestId,
    queue_base: extractQueueBase(statusUrl, appId),
    status: typeof b.status === "string" ? b.status : undefined,
    response_url: typeof b.response_url === "string" ? b.response_url : undefined,
    status_url: statusUrl,
    cancel_url: typeof b.cancel_url === "string" ? b.cancel_url : undefined,
    raw: body,
  }
}

/**
 * Poll the queue status for a Fal request.
 *
 * IMPORTANT: Fal groups status/result lookups by VENDOR prefix, not the full
 * app path. e.g. submitting to
 *   fal-ai/bytedance/seedance/v2/pro/text-to-video
 * returns a status_url at
 *   https://queue.fal.run/fal-ai/bytedance/requests/{id}/status
 *
 * Polling at /{full-app-id}/requests/{id}/status returns 405. So we store
 * the queue prefix that submit told us about (`queueBase` = path after
 * queue.fal.run, before /requests/{id}) and use it for both status and
 * result fetches.
 */
export async function queryFalQueueStatus(
  queueBase: string,
  requestId: string,
): Promise<FalQueueStatus> {
  const path = queueBase.startsWith("/") ? queueBase : `/${queueBase}`
  const { status, body } = await falFetch(`${path}/requests/${requestId}/status`, { method: "GET" })
  if (status < 200 || status >= 300) {
    throw classifyFalError(status, body)
  }
  const b = (body || {}) as Record<string, unknown>
  return {
    status: typeof b.status === "string" ? b.status : "IN_QUEUE",
    queue_position: typeof b.queue_position === "number" ? b.queue_position : undefined,
    logs: Array.isArray(b.logs) ? (b.logs as FalQueueStatus["logs"]) : undefined,
    request_id: typeof b.request_id === "string" ? b.request_id : requestId,
    raw: body,
  }
}

/**
 * Fetch the final result for a completed Fal request.
 */
export async function queryFalResult(queueBase: string, requestId: string): Promise<FalResult> {
  const path = queueBase.startsWith("/") ? queueBase : `/${queueBase}`
  const { status, body } = await falFetch(`${path}/requests/${requestId}`, { method: "GET" })
  if (status < 200 || status >= 300) {
    throw classifyFalError(status, body)
  }
  const b = (body || {}) as Record<string, unknown>
  return {
    images: Array.isArray(b.images) ? (b.images as FalResult["images"]) : undefined,
    image: typeof b.image === "object" && b.image ? (b.image as FalResult["image"]) : undefined,
    video: typeof b.video === "object" && b.video ? (b.video as FalResult["video"]) : undefined,
    videos: Array.isArray(b.videos) ? (b.videos as FalResult["videos"]) : undefined,
    output: b.output,
    raw: body,
  }
}
