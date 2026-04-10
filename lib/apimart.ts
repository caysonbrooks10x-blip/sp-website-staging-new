const APIMART_BASE_URL = "https://api.apimart.ai/v1"
const DEFAULT_TIMEOUT_MS = 30_000
const MAX_SAFE_RETRIES = 5
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504])

export interface ApiMartRequestOptions {
  method?: "GET" | "POST"
  path: string
  body?: unknown
  language?: string
  timeoutMs?: number
  retries?: number
}

export class ApiMartRequestError extends Error {
  status?: number
  code?: number
  retriable: boolean

  constructor(
    message: string,
    options: {
      status?: number
      code?: number
      retriable?: boolean
    } = {}
  ) {
    super(message)
    this.name = "ApiMartRequestError"
    this.status = options.status
    this.code = options.code
    this.retriable = options.retriable ?? false
  }
}

function getApiMartKey(): string {
  const key = process.env.APIMART_API_KEY
  if (!key) {
    throw new Error("APIMART_API_KEY is not configured on the server")
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

function buildErrorFromResponse(response: Response, data: any): ApiMartRequestError {
  const status = response.status
  const code =
    data && typeof data === "object" && typeof data.code === "number"
      ? data.code
      : undefined

  const errorMessage =
    (data && typeof data === "object" && "message" in data && typeof data.message === "string" && data.message) ||
    (data && typeof data === "object" && "error" in data && typeof data.error === "string" && data.error) ||
    `ApiMart request failed with ${status}`

  return new ApiMartRequestError(errorMessage, {
    status,
    code,
    retriable: RETRYABLE_STATUS_CODES.has(status),
  })
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiMartRequestError) {
    return error.retriable
  }

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

export async function apimartRequest<T>({
  method = "GET",
  path,
  body,
  language,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retries,
}: ApiMartRequestOptions): Promise<T> {
  const key = getApiMartKey()
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const url = new URL(`${APIMART_BASE_URL}${normalizedPath}`)

  if (language) {
    url.searchParams.set("language", language)
  }

  const defaultRetries = method === "GET" ? 2 : 0
  const maxRetries = Math.max(0, Math.min(MAX_SAFE_RETRIES, retries ?? defaultRetries))

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      const response = await fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      }).finally(() => {
        clearTimeout(timeout)
      })

      const text = await response.text()
      const data = parseBody(text)

      if (!response.ok) {
        throw buildErrorFromResponse(response, data)
      }

      return data as T
    } catch (error: unknown) {
      const timedOut = error instanceof Error && error.name === "AbortError"
      const normalizedError =
        timedOut
          ? new ApiMartRequestError(`ApiMart request timed out after ${Math.round(timeoutMs / 1000)}s`, {
              status: 504,
              retriable: true,
            })
          : error

      const shouldRetry = attempt < maxRetries && isRetryableError(normalizedError)
      if (!shouldRetry) {
        if (normalizedError instanceof Error) throw normalizedError
        throw new Error("ApiMart request failed")
      }

      const baseDelay = 450 * Math.pow(2, attempt)
      await sleep(jitter(Math.min(baseDelay, 5_000)))
    }
  }

  throw new Error("ApiMart request failed")
}

export interface ApiMartTaskImageResult {
  url: string[]
  expires_at?: number
}

export interface ApiMartTaskVideoResult {
  url: string
  thumbnail_url?: string
  expires_at?: number
}

export interface ApiMartTaskStatusResponse {
  code: number
  data: {
    id: string
    status: "pending" | "processing" | "completed" | "failed" | "cancelled"
    progress?: number
    result?: {
      images?: ApiMartTaskImageResult[]
      videos?: ApiMartTaskVideoResult[]
      thumbnail_url?: string
    }
    error?: {
      code?: number
      message?: string
      type?: string
    }
    created?: number
    completed?: number
    estimated_time?: number
    actual_time?: number
  }
}

export interface ApiMartSubmissionResponse {
  code: number
  data: Array<{
    status: string
    task_id: string
  }>
}

export interface ApiMartDirectImageResponse {
  created: number
  background?: string
  output_format?: string
  data: Array<{
    b64_json?: string
    url?: string
    revised_prompt?: string
  }>
}

export interface ApiMartBalanceResponse {
  success: boolean
  remain_balance: number
  used_balance: number
  unlimited_quota: boolean
  message?: string
}

export async function queryApiMartTokenBalance() {
  return apimartRequest<ApiMartBalanceResponse>({
    path: "/balance",
  })
}

export async function queryApiMartUserBalance() {
  return apimartRequest<ApiMartBalanceResponse>({
    path: "/user/balance",
  })
}

export async function submitApiMartImageGeneration(body: Record<string, unknown>) {
  return apimartRequest<ApiMartSubmissionResponse | ApiMartDirectImageResponse>({
    method: "POST",
    path: "/images/generations",
    body,
  })
}

export async function submitApiMartVideoGeneration(body: Record<string, unknown>) {
  return apimartRequest<ApiMartSubmissionResponse>({
    method: "POST",
    path: "/videos/generations",
    body,
  })
}

export async function queryApiMartTaskStatus(taskId: string, language = "en") {
  return apimartRequest<ApiMartTaskStatusResponse>({
    path: `/tasks/${taskId}`,
    language,
    retries: 3,
  })
}

export async function remixApiMartVideo(videoId: string, body: Record<string, unknown>) {
  return apimartRequest<ApiMartSubmissionResponse>({
    method: "POST",
    path: `/videos/${videoId}/remix`,
    body,
  })
}
