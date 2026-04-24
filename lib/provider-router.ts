/**
 * Unified provider router — used by /api/route/* endpoints.
 *
 * Takes a flat `{ model, prompt, ...params }` payload from any client
 * (web, Telegram bot, etc.), decides ApiMart vs Poyo via
 * `chooseProvider` (handoff §12), executes with cross-provider fallback
 * via `executeWithFallback`, and normalizes the submit/status response
 * to a shape both providers can fit into:
 *
 *   Submit:  { provider, task_id, raw }
 *   Status:  { provider, task_id, status, progress?, output_urls[],
 *              thumbnail_url?, error?, raw }
 *
 * Clients are expected to pass `provider` back on every status poll so
 * we know which upstream to hit (we do not persist task-id ↔ provider
 * mapping server-side; the client owns that).
 */

import {
  submitApiMartImageGeneration,
  submitApiMartVideoGeneration,
  remixApiMartVideo,
  queryApiMartTaskStatus,
  ApiMartRequestError,
  type ApiMartTaskStatusResponse,
  type ApiMartSubmissionResponse,
  type ApiMartDirectImageResponse,
} from "@/lib/apimart"
import {
  submitPoyoGeneration,
  queryPoyoTaskStatus,
  PoyoRequestError,
  type PoyoTaskStatusResponse,
  type PoyoSubmitResponse,
} from "@/lib/poyo"
import {
  chooseProvider,
  getProviderFallback,
  resolveProviderModelId,
  type ProviderRoutingInput,
  type StudioProvider,
} from "@/lib/provider-routing"
import {
  executeWithFallback,
  buildProviderCall,
} from "@/lib/provider-execution"

export type NormalizedStatus = "pending" | "processing" | "completed" | "failed"

export interface NormalizedSubmit {
  provider: StudioProvider
  task_id: string
  model: string
  used_fallback: boolean
  raw: unknown
}

export interface NormalizedTaskStatus {
  provider: StudioProvider
  task_id: string
  status: NormalizedStatus
  progress?: number
  output_urls: string[]
  thumbnail_url?: string
  error?: { message?: string; code?: string | number }
  raw: unknown
}

function flattenUrlList(input: unknown): string[] {
  if (typeof input === "string" && input.trim().length > 0) {
    return [input]
  }

  if (!Array.isArray(input)) return []

  return input.flatMap((entry) => flattenUrlList(entry))
}

export interface PublicProviderErrorDetails {
  code: string
  status?: number
  provider?: StudioProvider
  model?: string
  retryable?: boolean
  raw_message?: string
  primary_provider?: StudioProvider
  fallback_provider?: StudioProvider
  primary_error?: string
  fallback_error?: string
}

export interface PublicProviderErrorPayload {
  error: string
  details: PublicProviderErrorDetails
}

// -------------------------------------------------------------------
// Provider-specific submit adapters
// Each takes the flat bot/web payload and shapes it for the upstream.
// -------------------------------------------------------------------

function extractTaskIdFromApiMart(
  raw: ApiMartSubmissionResponse | ApiMartDirectImageResponse,
): string {
  if ("data" in raw && Array.isArray(raw.data) && raw.data.length > 0) {
    const first: any = raw.data[0]
    if (first && typeof first.task_id === "string") return first.task_id
    if (first && typeof first.b64_json === "string") return `direct-${Date.now()}`
    if (first && typeof first.url === "string") return `direct-${Date.now()}`
  }
  throw new Error("ApiMart submit response had no task_id")
}

function extractTaskIdFromPoyo(raw: unknown): string {
  // Poyo responds with { code, data: { task_id, status, created_time } }.
  // The lib/poyo type exposed task_id at the top level, but the real wire
  // shape wraps it under `data`. Handle both defensively.
  const r = raw as any
  if (r && typeof r === "object") {
    if (typeof r.task_id === "string") return r.task_id
    if (r.data && typeof r.data === "object" && typeof r.data.task_id === "string") {
      return r.data.task_id
    }
  }
  throw new Error("Poyo submit response had no task_id")
}

async function submitImage(
  provider: StudioProvider,
  payload: Record<string, unknown>,
): Promise<{ task_id: string; raw: unknown }> {
  const wirePayload = translateModelForProvider(provider, payload)
  if (provider === "apimart") {
    const raw = await submitApiMartImageGeneration(wirePayload)
    return { task_id: extractTaskIdFromApiMart(raw), raw }
  }
  const { model, ...rest } = wirePayload as { model: string } & Record<string, unknown>
  const raw = await submitPoyoGeneration({ model, inputs: rest })
  return { task_id: extractTaskIdFromPoyo(raw), raw }
}

async function submitVideo(
  provider: StudioProvider,
  payload: Record<string, unknown>,
): Promise<{ task_id: string; raw: unknown }> {
  const wirePayload = translateModelForProvider(provider, payload)
  if (provider === "apimart") {
    const raw = await submitApiMartVideoGeneration(normalizeApiMartVideoPayload(wirePayload))
    return { task_id: extractTaskIdFromApiMart(raw), raw }
  }
  const normalized = normalizePoyoVideoPayload(wirePayload)
  const { model, ...rest } = normalized as { model: string } & Record<string, unknown>
  const raw = await submitPoyoGeneration({ model, inputs: rest })
  return { task_id: extractTaskIdFromPoyo(raw), raw }
}

/**
 * Poyo-side payload shaping for video models.
 *
 * Poyo rejects the shared canonical payload for seedance/veo models because
 * its per-model input spec differs from ApiMart's:
 *
 *   - seedance-2 / seedance-2-fast: `duration` is required (Poyo 400s if
 *                                   absent). Default to 4s (UI default).
 *   - veo3.1-*: duration is fixed at 8 seconds on Poyo; wants the `seconds`
 *               key rather than a generic duration.
 *
 * ApiMart accepts these fields natively, so this only runs when the router
 * picked Poyo.
 */
function normalizePoyoVideoPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const model = typeof payload.model === "string" ? payload.model : ""
  const out: Record<string, unknown> = normalizeReferenceMediaPayload(payload)

  if (model === "seedance-2" || model === "seedance-2-fast") {
    if (out.duration === undefined) out.duration = 5
    if (out.resolution === undefined) out.resolution = "720p"
    if (Array.isArray(out.image_urls)) out.image_urls = out.image_urls.slice(0, 2)
  }

  if (model === "sora-2-official") {
    if (out.duration === undefined) out.duration = 4
    if (Array.isArray(out.image_urls)) out.image_urls = out.image_urls.slice(0, 1)
    delete out.resolution
  }

  if (model === "hailuo-2.3") {
    const imageUrls = flattenUrlList(out.image_urls)
    if (!out.start_image_url && imageUrls[0]) out.start_image_url = imageUrls[0]
    delete out.image_url
    delete out.image_urls
  }

  if (model.startsWith("veo3.1")) {
    out.seconds = 8
    delete out.duration
  }

  return out
}

function normalizeApiMartVideoPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const model = typeof payload.model === "string" ? payload.model : ""
  const out: Record<string, unknown> = normalizeReferenceMediaPayload(payload)
  const aspect = typeof out.aspect_ratio === "string" ? out.aspect_ratio : typeof out.size === "string" ? out.size : undefined

  if (model === "doubao-seedance-2.0") {
    if (aspect) out.size = aspect
    delete out.aspect_ratio
    if (out.duration === undefined) out.duration = 5
    if (out.resolution === undefined) out.resolution = "720p"
    if (Array.isArray(out.image_urls)) out.image_urls = out.image_urls.slice(0, 2)
  }

  if (model === "grok-imagine-1.0-video-apimart") {
    if (aspect) out.size = aspect
    delete out.aspect_ratio
  }

  if (model.includes("sora-2")) {
    if (Array.isArray(out.image_urls)) out.image_urls = out.image_urls.slice(0, 1)
  }

  return out
}

function normalizeReferenceMediaPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload }
  const imageUrls = [
    ...flattenUrlList(out.image_urls),
    ...flattenUrlList(out.image_url),
    ...flattenUrlList(out.start_image_url),
    ...flattenUrlList(out.end_image_url),
    ...flattenUrlList(out.reference_image_url),
    ...flattenUrlList(out.source_image_url),
  ].filter(Boolean)

  const videoUrls = [
    ...flattenUrlList(out.video_urls),
    ...flattenUrlList(out.video_url),
    ...flattenUrlList(out.reference_video_url),
    ...flattenUrlList(out.source_video_url),
  ].filter(Boolean)

  if (imageUrls.length > 0) out.image_urls = Array.from(new Set(imageUrls))
  if (videoUrls.length > 0 && !out.reference_video_urls) out.reference_video_urls = Array.from(new Set(videoUrls))

  return out
}

// Translate payload.model from studio-canonical → provider-wire ID, if
// the chosen provider uses a different upstream name for the same model.
// No-op when no alias is registered.
function translateModelForProvider(
  provider: StudioProvider,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const canonical = typeof payload.model === "string" ? payload.model : undefined
  if (!canonical) return payload
  const wireName = resolveProviderModelId(canonical, provider)
  if (wireName === canonical) return payload
  return { ...payload, model: wireName }
}

async function submitRemix(
  videoId: string,
  payload: Record<string, unknown>,
): Promise<{ task_id: string; raw: unknown }> {
  // Remix is ApiMart-only per handoff §12.
  const raw = await remixApiMartVideo(videoId, payload)
  return { task_id: extractTaskIdFromApiMart(raw), raw }
}

// -------------------------------------------------------------------
// Submit entry points (image / video / remix)
// -------------------------------------------------------------------

export async function routeImageSubmit(
  payload: Record<string, unknown>,
): Promise<NormalizedSubmit> {
  const model = typeof payload.model === "string" ? payload.model : undefined
  if (!model) throw new Error("model is required")

  const routingInput: ProviderRoutingInput = {
    mode: "image",
    model,
    hasReferenceImage: Boolean(payload.image_url || (payload as any).image_urls),
    params: buildRoutingParams(payload),
  }
  const provider = chooseProvider(routingInput)
  const fallbackPlan = getProviderFallback(model)

  const primary = buildProviderCall(provider, model, () => submitImage(provider, payload))
  const fallback = fallbackPlan && fallbackPlan.provider !== provider
    ? buildProviderCall(fallbackPlan.provider, fallbackPlan.model, () =>
        submitImage(fallbackPlan.provider, payload),
      )
    : null

  const outcome = await executeWithFallback(primary, fallback)
  return {
    provider: outcome.provider,
    task_id: outcome.result.task_id,
    model: outcome.model,
    used_fallback: outcome.usedFallback,
    raw: outcome.result.raw,
  }
}

export async function routeVideoSubmit(
  payload: Record<string, unknown>,
): Promise<NormalizedSubmit> {
  const model = typeof payload.model === "string" ? payload.model : undefined
  if (!model) throw new Error("model is required")

  const routingInput: ProviderRoutingInput = {
    mode: "video",
    model,
    hasReferenceImage: Boolean(
      payload.image_url ||
        (payload as any).image_urls ||
        payload.start_image_url ||
        payload.end_image_url ||
        payload.reference_image_url ||
        payload.source_image_url,
    ),
    params: buildRoutingParams(payload),
  }
  const provider = chooseProvider(routingInput)
  const fallbackPlan = getProviderFallback(model)

  const primary = buildProviderCall(provider, model, () => submitVideo(provider, payload))
  const fallback = fallbackPlan && fallbackPlan.provider !== provider
    ? buildProviderCall(fallbackPlan.provider, fallbackPlan.model, () =>
        submitVideo(fallbackPlan.provider, payload),
      )
    : null

  const outcome = await executeWithFallback(primary, fallback)
  return {
    provider: outcome.provider,
    task_id: outcome.result.task_id,
    model: outcome.model,
    used_fallback: outcome.usedFallback,
    raw: outcome.result.raw,
  }
}

export async function routeRemixSubmit(
  videoId: string,
  payload: Record<string, unknown>,
): Promise<NormalizedSubmit> {
  const result = await submitRemix(videoId, payload)
  return {
    provider: "apimart",
    task_id: result.task_id,
    model: typeof payload.model === "string" ? payload.model : "remix",
    used_fallback: false,
    raw: result.raw,
  }
}

// -------------------------------------------------------------------
// Status — the caller tells us which provider owns the task.
// -------------------------------------------------------------------

export async function routeTaskStatus(
  provider: StudioProvider,
  taskId: string,
  language = "en",
): Promise<NormalizedTaskStatus> {
  if (provider === "apimart") {
    const raw = await queryApiMartTaskStatus(taskId, language)
    return normalizeApiMartStatus(taskId, raw)
  }
  const raw = await queryPoyoTaskStatus(taskId)
  return normalizePoyoStatus(taskId, raw)
}

// -------------------------------------------------------------------
// Normalizers
// -------------------------------------------------------------------

function normalizeApiMartStatus(
  taskId: string,
  raw: ApiMartTaskStatusResponse,
): NormalizedTaskStatus {
  const d = raw?.data
  const statusMap: Record<string, NormalizedStatus> = {
    pending: "pending",
    processing: "processing",
    completed: "completed",
    failed: "failed",
    cancelled: "failed",
  }
  const status: NormalizedStatus = d?.status ? statusMap[d.status] ?? "pending" : "pending"

  const imageUrls = (d?.result?.images ?? []).flatMap((i) => flattenUrlList(i?.url))
  const videoUrls = (d?.result?.videos ?? []).flatMap((v) => flattenUrlList(v?.url))
  const thumbnail =
    d?.result?.videos?.[0]?.thumbnail_url ||
    d?.result?.thumbnail_url ||
    undefined

  return {
    provider: "apimart",
    task_id: taskId,
    status,
    progress: typeof d?.progress === "number" ? d.progress : undefined,
    output_urls: [...imageUrls, ...videoUrls],
    thumbnail_url: thumbnail,
    error: d?.error ? { message: d.error.message, code: d.error.code } : undefined,
    raw,
  }
}

function normalizePoyoStatus(
  taskId: string,
  raw: PoyoTaskStatusResponse,
): NormalizedTaskStatus {
  // Poyo status also appears to wrap the real payload under `data`.
  // Accept both shapes: flat {state,...} or wrapped {code, data: {state,...}}.
  const rAny = raw as any
  const body: any =
    rAny && typeof rAny === "object" && rAny.data && typeof rAny.data === "object"
      ? rAny.data
      : rAny
  const statusMap: Record<string, NormalizedStatus> = {
    not_started: "pending",
    queued: "pending",
    pending: "pending",
    processing: "processing",
    running: "processing",
    completed: "completed",
    succeeded: "completed",
    finished: "completed",
    failed: "failed",
    error: "failed",
    cancelled: "failed",
  }
  const status: NormalizedStatus = body?.state
    ? statusMap[body.state] ?? "pending"
    : body?.status
      ? statusMap[body.status] ?? "pending"
      : "pending"
  // Poyo wire shape uses `files: [{ file_url, file_type, thumbnail_url? }]`.
  // The old PoyoTaskAsset type described `outputs: [{ url, type }]` which
  // doesn't match what the server actually returns. Accept both.
  const files: any[] = Array.isArray(body?.files) ? body.files : []
  const outputs: any[] = Array.isArray(body?.outputs) ? body.outputs : []
  const output_urls = [
    ...files.flatMap((f: any) => flattenUrlList(f?.file_url)),
    ...outputs.flatMap((o: any) => flattenUrlList(o?.url)),
  ]
  const thumbnail =
    files.find((f: any) => f?.thumbnail_url)?.thumbnail_url ??
    outputs.find((o: any) => o?.thumbnail_url)?.thumbnail_url
  const errorMessage =
    typeof body?.error_message === "string" && body.error_message
      ? body.error_message
      : undefined

  return {
    provider: "poyo",
    task_id: taskId,
    status,
    progress: typeof body?.progress === "number" ? body.progress : undefined,
    output_urls,
    thumbnail_url: thumbnail,
    error: body?.error
      ? { message: body.error.message, code: body.error.code }
      : errorMessage
        ? { message: errorMessage }
        : undefined,
    raw,
  }
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function buildRoutingParams(payload: Record<string, unknown>) {
  return {
    aspect_ratio: typeof payload.aspect_ratio === "string" ? payload.aspect_ratio : undefined,
    resolution: typeof payload.resolution === "string" ? payload.resolution : undefined,
    duration: typeof payload.duration === "number" || typeof payload.duration === "string"
      ? (payload.duration as number | string)
      : undefined,
    n: typeof payload.n === "number" ? payload.n : undefined,
    template: typeof payload.template === "string" ? payload.template : undefined,
    camera_movement: typeof payload.camera_movement === "string" ? payload.camera_movement : undefined,
    kling_elements: payload.kling_elements as boolean | string[] | undefined,
    last_frame_image: typeof payload.last_frame_image === "string" ? payload.last_frame_image : undefined,
    mask_url: typeof payload.mask_url === "string" ? payload.mask_url : undefined,
    generation_type: typeof payload.generation_type === "string" ? payload.generation_type : undefined,
    official_tier: typeof payload.official_tier === "boolean" ? payload.official_tier : undefined,
  }
}

function prettifyModelName(model?: string): string {
  if (!model) return "This model"
  return model
    .replace(/\//g, " ")
    .replace(/-/g, " ")
    .replace(/\bofficial\b/gi, "Official")
    .replace(/\bpro\b/gi, "Pro")
    .replace(/\bvip\b/gi, "VIP")
    .replace(/\bveo\b/gi, "Veo")
    .replace(/\bwan\b/gi, "Wan")
    .replace(/\bgrok\b/gi, "Grok")
    .replace(/\bsora\b/gi, "Sora")
    .replace(/\bseedance\b/gi, "Seedance")
    .replace(/\bkling\b/gi, "Kling")
    .replace(/\bhailuo\b/gi, "Hailuo")
    .replace(/\bdoubao\b/gi, "Doubao")
    .replace(/\bmini max\b/gi, "MiniMax")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function unwrapProviderError(error: unknown): {
  provider?: StudioProvider
  status?: number
  code?: number | string
  retriable?: boolean
  rawMessage: string
} {
  if (error instanceof ApiMartRequestError) {
    return {
      provider: "apimart",
      status: error.status,
      code: error.code,
      retriable: error.retriable,
      rawMessage: error.message,
    }
  }
  if (error instanceof PoyoRequestError) {
    return {
      provider: "poyo",
      status: error.status,
      code: error.code,
      retriable: error.retriable,
      rawMessage: error.message,
    }
  }
  if (error instanceof Error) {
    return { rawMessage: error.message }
  }
  return { rawMessage: "Unknown provider error" }
}

function classifyProviderFailure(
  error: unknown,
  model?: string,
): PublicProviderErrorPayload {
  const modelName = prettifyModelName(model)
  const meta = unwrapProviderError(error)
  const rawMessage = meta.rawMessage || "Unknown provider error"
  const lowered = rawMessage.toLowerCase()

  if (
    meta.status === 402 ||
    lowered.includes("insufficient account balance") ||
    lowered.includes("top up") ||
    lowered.includes("low on credits")
  ) {
    return {
      error: `${modelName} is temporarily unavailable because the upstream service has exhausted its available balance. Please try again later or switch to another model.`,
      details: {
        code: "PROVIDER_BALANCE_LOW",
        status: meta.status,
        provider: meta.provider,
        model,
        retryable: meta.retriable,
        raw_message: rawMessage,
      },
    }
  }

  if (
    meta.status === 404 ||
    lowered.includes("model not found") ||
    lowered.includes("not currently available")
  ) {
    return {
      error: `${modelName} is not currently available on the live execution route. Please switch models and try again.`,
      details: {
        code: "MODEL_UNAVAILABLE",
        status: meta.status,
        provider: meta.provider,
        model,
        retryable: meta.retriable,
        raw_message: rawMessage,
      },
    }
  }

  if (
    meta.status === 422 ||
    lowered.includes("not support") ||
    lowered.includes("unsupported") ||
    lowered.includes("invalid") ||
    lowered.includes("parameter")
  ) {
    return {
      error: `${modelName} rejected the current settings. Adjust duration, resolution, or reference inputs and try again.`,
      details: {
        code: "MODEL_SETTINGS_UNSUPPORTED",
        status: meta.status,
        provider: meta.provider,
        model,
        retryable: meta.retriable,
        raw_message: rawMessage,
      },
    }
  }

  if (
    meta.status === 429 ||
    meta.status === 503 ||
    meta.status === 504 ||
    lowered.includes("please wait and try again later") ||
    lowered.includes("at capacity") ||
    lowered.includes("temporarily unavailable") ||
    lowered.includes("server exception")
  ) {
    return {
      error: `${modelName} is temporarily at capacity on the upstream service. Please retry in a few minutes or switch to another model.`,
      details: {
        code: "PROVIDER_CAPACITY",
        status: meta.status,
        provider: meta.provider,
        model,
        retryable: meta.retriable,
        raw_message: rawMessage,
      },
    }
  }

  return {
    error: `${modelName} could not be queued because the upstream service rejected the request. Please retry or switch models.`,
    details: {
      code: "UPSTREAM_SUBMIT_FAILED",
      status: meta.status,
      provider: meta.provider,
      model,
      retryable: meta.retriable,
      raw_message: rawMessage,
    },
  }
}

export function buildProviderErrorPayload(
  error: unknown,
  context: { model?: string } = {},
): PublicProviderErrorPayload {
  const combined = error as Error & {
    primaryError?: unknown
    fallbackError?: unknown
  }
  if (combined?.primaryError || combined?.fallbackError) {
    const primary = classifyProviderFailure(combined.primaryError, context.model)
    const fallback = classifyProviderFailure(combined.fallbackError, context.model)
    const modelName = prettifyModelName(context.model)
    return {
      error: `${modelName} could not be queued because both the primary and backup routes failed. ${fallback.error}`,
      details: {
        code: "FALLBACK_EXHAUSTED",
        model: context.model,
        primary_provider: primary.details.provider,
        fallback_provider: fallback.details.provider,
        primary_error: primary.details.raw_message,
        fallback_error: fallback.details.raw_message,
        raw_message: combined.message,
      },
    }
  }
  return classifyProviderFailure(error, context.model)
}

export function inferHttpStatus(error: unknown): number {
  const combined = error as Error & { primaryError?: unknown; fallbackError?: unknown }
  if (combined?.primaryError || combined?.fallbackError) {
    const primaryStatus = inferHttpStatus(combined.primaryError)
    if (primaryStatus !== 500) return primaryStatus
    const fallbackStatus = inferHttpStatus(combined.fallbackError)
    if (fallbackStatus !== 500) return fallbackStatus
    return 503
  }
  if (error instanceof ApiMartRequestError && error.status) return error.status
  if (error instanceof PoyoRequestError && error.status) return error.status
  return 500
}
