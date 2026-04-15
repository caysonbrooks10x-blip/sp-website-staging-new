/**
 * Poyo.ai API client — mirrors lib/apimart.ts pattern.
 *
 * Base:    https://api.poyo.ai
 * Auth:    Authorization: Bearer ${POYO_API_KEY}
 * Submit:  POST /api/generate/submit         { model, inputs, callback_url? }
 * Status:  GET  /api/generate/status/{task_id}
 * Balance: GET  /api/user/balance
 * Units:   1 credit = $0.005 USD, asset TTL = 3 days
 *
 * Poyo accepts a unified submit endpoint for every model. Model-specific
 * params go in `inputs`. The server returns `{ task_id }`; callers poll
 * status until `state == "completed"` or register a webhook via
 * `callback_url` and skip polling.
 */

const POYO_BASE_URL = process.env.POYO_BASE_URL?.trim() || "https://api.poyo.ai"
const DEFAULT_TIMEOUT_MS = 30_000
const MAX_SAFE_RETRIES = 5
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504])

export interface PoyoRequestOptions {
  method?: "GET" | "POST"
  path: string
  body?: unknown
  timeoutMs?: number
  retries?: number
}

export class PoyoRequestError extends Error {
  status?: number
  code?: number | string
  retriable: boolean

  constructor(
    message: string,
    options: { status?: number; code?: number | string; retriable?: boolean } = {},
  ) {
    super(message)
    this.name = "PoyoRequestError"
    this.status = options.status
    this.code = options.code
    this.retriable = options.retriable ?? false
  }
}

function getPoyoKey(): string {
  const key = process.env.POYO_API_KEY
  if (!key) {
    throw new Error("POYO_API_KEY is not configured on the server")
  }
  return key
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function jitter(ms: number) {
  return Math.floor(ms * (0.85 + Math.random() * 0.3))
}

function parseBody(text: string) {
  if (!text) return null
  try {
    return JSON.parse(text) as any
  } catch {
    return null
  }
}

function buildErrorFromResponse(response: Response, data: any): PoyoRequestError {
  const status = response.status
  const code =
    data && typeof data === "object" && (typeof data.code === "number" || typeof data.code === "string")
      ? data.code
      : undefined

  const errorMessage =
    (data && typeof data === "object" && "message" in data && typeof data.message === "string" && data.message) ||
    (data && typeof data === "object" && "error" in data && typeof data.error === "string" && data.error) ||
    `Poyo request failed with ${status}`

  return new PoyoRequestError(errorMessage, {
    status,
    code,
    retriable: RETRYABLE_STATUS_CODES.has(status),
  })
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof PoyoRequestError) return error.retriable
  if (error instanceof Error) {
    const name = error.name.toLowerCase()
    const message = error.message.toLowerCase()
    return (
      name.includes("abort") ||
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("fetch failed") ||
      message.includes("temporarily unavailable")
    )
  }
  return false
}

export async function poyoRequest<T>({
  method = "GET",
  path,
  body,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retries,
}: PoyoRequestOptions): Promise<T> {
  const key = getPoyoKey()
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const url = `${POYO_BASE_URL}${normalizedPath}`
  const defaultRetries = method === "GET" ? 2 : 0
  const maxRetries = Math.max(0, Math.min(MAX_SAFE_RETRIES, retries ?? defaultRetries))

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout))

      const text = await response.text()
      const data = parseBody(text)

      if (!response.ok) throw buildErrorFromResponse(response, data)
      return data as T
    } catch (error: unknown) {
      const timedOut = error instanceof Error && error.name === "AbortError"
      const normalizedError = timedOut
        ? new PoyoRequestError(`Poyo request timed out after ${Math.round(timeoutMs / 1000)}s`, {
            status: 504,
            retriable: true,
          })
        : error

      const shouldRetry = attempt < maxRetries && isRetryableError(normalizedError)
      if (!shouldRetry) {
        if (normalizedError instanceof Error) throw normalizedError
        throw new Error("Poyo request failed")
      }
      const baseDelay = 450 * Math.pow(2, attempt)
      await sleep(jitter(Math.min(baseDelay, 5_000)))
    }
  }
  throw new Error("Poyo request failed")
}

// -------------------------------------------------------------------
// Typed responses
// -------------------------------------------------------------------

export interface PoyoSubmitResponse {
  task_id: string
  state?: "queued" | "processing" | "completed" | "failed"
  credits_charged?: number
}

export type PoyoTaskState = "queued" | "processing" | "completed" | "failed" | "cancelled"

export interface PoyoTaskAsset {
  url: string
  type?: "image" | "video" | "audio"
  thumbnail_url?: string
  width?: number
  height?: number
  duration?: number
  expires_at?: number
}

export interface PoyoTaskStatusResponse {
  task_id: string
  state: PoyoTaskState
  progress?: number
  model?: string
  outputs?: PoyoTaskAsset[]
  error?: { code?: string | number; message?: string }
  created_at?: number
  completed_at?: number
  credits_charged?: number
}

export interface PoyoBalanceResponse {
  credits_remaining: number
  credits_used?: number
  unlimited?: boolean
}

// -------------------------------------------------------------------
// Public surface
// -------------------------------------------------------------------

export interface PoyoSubmitInput {
  model: string
  inputs: Record<string, unknown>
  callback_url?: string
  idempotency_key?: string
}

export async function submitPoyoGeneration(body: PoyoSubmitInput) {
  return poyoRequest<PoyoSubmitResponse>({
    method: "POST",
    path: "/api/generate/submit",
    body,
  })
}

export async function queryPoyoTaskStatus(taskId: string) {
  return poyoRequest<PoyoTaskStatusResponse>({
    path: `/api/generate/status/${encodeURIComponent(taskId)}`,
    retries: 3,
  })
}

export async function queryPoyoBalance() {
  return poyoRequest<PoyoBalanceResponse>({
    path: "/api/user/balance",
    retries: 2,
  })
}

/**
 * Convert Poyo credits → USD. 1 credit = $0.005.
 */
export function poyoCreditsToUsd(credits: number): number {
  return Math.round(credits * 0.005 * 1000) / 1000
}

export function isPoyoTaskTerminal(state?: PoyoTaskState): boolean {
  return state === "completed" || state === "failed" || state === "cancelled"
}
