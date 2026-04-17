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
    const raw = await submitApiMartVideoGeneration(wirePayload)
    return { task_id: extractTaskIdFromApiMart(raw), raw }
  }
  const { model, ...rest } = wirePayload as { model: string } & Record<string, unknown>
  const raw = await submitPoyoGeneration({ model, inputs: rest })
  return { task_id: extractTaskIdFromPoyo(raw), raw }
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
    hasReferenceImage: Boolean(payload.image_url),
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

  const imageUrls = (d?.result?.images ?? []).flatMap((i) => (Array.isArray(i?.url) ? i.url : []))
  const videoUrls = (d?.result?.videos ?? []).map((v) => v?.url).filter((u): u is string => !!u)
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
    ...files.map((f: any) => f?.file_url).filter((u: unknown): u is string => typeof u === "string"),
    ...outputs.map((o: any) => o?.url).filter((u: unknown): u is string => typeof u === "string"),
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

export function inferHttpStatus(error: unknown): number {
  if (error instanceof ApiMartRequestError && error.status) return error.status
  if (error instanceof PoyoRequestError && error.status) return error.status
  return 500
}
