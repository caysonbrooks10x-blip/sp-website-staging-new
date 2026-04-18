import type { ProviderHealthStatus } from "@/lib/provider-health"

export type StudioProvider = "poyo" | "apimart"

export interface ProviderRoutingParams {
  aspect_ratio?: string
  resolution?: string
  duration?: number | string
  n?: number
  template?: string
  camera_movement?: string
  kling_elements?: boolean | string[]
  last_frame_image?: string
  mask_url?: string
  generation_type?: string
  official_tier?: boolean
}

export interface ProviderRoutingInput {
  mode: "image" | "video" | "remix"
  model?: string
  wantsRemix?: boolean
  hasReferenceImage?: boolean
  needsCharacterReference?: boolean
  liveHealth?: ProviderHealthStatus
  params?: ProviderRoutingParams
}

export interface ProviderFallbackPlan {
  provider: StudioProvider
  model: string
  reason: string
}

export interface ProviderRoutingDecision {
  provider: StudioProvider
  health: "stable" | "watch" | "fallback-ready"
  notes: string[]
  fallback?: ProviderFallbackPlan
}

export interface StudioExecutionCapability {
  type: "image" | "video"
  requiresReferenceImage?: boolean
  requiresReferenceVideo?: boolean
  supportsPrompt?: boolean
}

export interface StudioExecutionValidationInput {
  mode: "image" | "video" | "remix"
  prompt?: string
  hasReferenceImage?: boolean
  hasReferenceVideo?: boolean
  capability?: StudioExecutionCapability
}

// -------------------------------------------------------------------
// MODEL_PROVIDERS — source of truth copied from handoff §12
// -------------------------------------------------------------------
// primary: provider used when no gates trigger
// also:    secondary provider that also exposes the model (for fallback)
// gateToApimart / gateToPoyo: param-triggered overrides (see chooseProvider Stage 2)
// -------------------------------------------------------------------

export type ProviderGate =
  | "n>1"
  | "extreme_ar"
  | "res=0.5K"
  | "remix"
  | "character"
  | "preview"
  | "vip"
  | "official_tier"
  | "kling_elements"
  | "generation_type=reference"
  | "need_last_frame_image_without_pro_mode"
  | "template_set"
  | "camera_movement_set"
  | "mask_url"
  | "n<=4 && need_apimart_behavior"

export interface ModelProviderEntry {
  primary: StudioProvider
  also?: StudioProvider[]
  gateToApimart?: ProviderGate[]
  gateToPoyo?: ProviderGate[]
}

export const MODEL_PROVIDERS: Record<string, ModelProviderEntry> = {
  // IMAGE
  "nano-banana":            { primary: "apimart", also: ["poyo"], gateToApimart: ["n>1"] },
  "nano-banana-2":          { primary: "apimart", also: ["poyo"], gateToApimart: ["n>1", "extreme_ar", "res=0.5K"] },
  "nano-banana-2-new":      { primary: "apimart", also: ["poyo"], gateToApimart: ["n>1", "extreme_ar", "res=0.5K"] },
  "nano-banana-2-official": { primary: "apimart", gateToPoyo: ["res=0.5K"] },
  "nano-banana-pro":        { primary: "poyo" },
  "gpt-4o-image":           { primary: "apimart", also: ["poyo"], gateToApimart: ["mask_url"] },
  "gpt-image-1.5":          { primary: "poyo", gateToApimart: ["official_tier", "mask_url"] },
  "flux-2-pro":             { primary: "apimart", also: ["poyo"] },
  "flux-2-flex":            { primary: "apimart", also: ["poyo"] },
  "flux-kontext-pro":       { primary: "apimart", also: ["poyo"] },
  "flux-kontext-max":       { primary: "apimart", also: ["poyo"] },
  "seedream-4.5":           { primary: "poyo", also: ["apimart"] },
  "seedream-5.0-lite":      { primary: "poyo", also: ["apimart"], gateToApimart: ["n<=4 && need_apimart_behavior"] },
  "z-image":                { primary: "poyo" },
  "qwen-image-2.0-pro":     { primary: "apimart" },
  "grok-imagine-image":     { primary: "apimart", also: ["poyo"] },
  "wan-2.7-image-pro":      { primary: "poyo" },
  "kling-o3-image":         { primary: "poyo" },
  "kling-o3-image-edit":    { primary: "poyo" },

  // VIDEO
  // Sora is ApiMart-only as of 2026-04-18: live probe of api.poyo.ai with
  // 8 candidate IDs (sora, sora2, sora-2, sora-2-text-to-video, etc.) all
  // returned 404 resource_not_found_error. Previous primary:"poyo" was
  // inherited from an earlier handoff doc and was never true on the wire.
  "sora-2":                 { primary: "apimart", gateToApimart: ["remix", "character", "preview", "vip"] },
  "sora-2-pro":             { primary: "apimart" },
  "sora-2-vip":             { primary: "apimart" },
  "sora-2-preview":         { primary: "apimart" },
  "sora-2-pro-preview":     { primary: "apimart" },
  "sora-2-official":        { primary: "apimart" },
  "veo3.1-lite":            { primary: "apimart" },
  "veo3.1-fast":            { primary: "apimart", also: ["poyo"] },
  "veo3.1-quality":         { primary: "apimart", also: ["poyo"], gateToPoyo: ["generation_type=reference"] },
  "veo3.1-fast-official":   { primary: "apimart" },
  "veo3.1-quality-official":{ primary: "apimart" },
  "kling-2.6":              { primary: "apimart", also: ["poyo"], gateToPoyo: ["need_last_frame_image_without_pro_mode"] },
  "kling-3.0/standard":     { primary: "apimart", also: ["poyo"], gateToPoyo: ["kling_elements"] },
  "kling-3.0/pro":          { primary: "apimart", also: ["poyo"], gateToPoyo: ["kling_elements"] },
  "kling-v3-omni":          { primary: "apimart" },
  "kling-video-o1":         { primary: "apimart" },
  "seedance-2":             { primary: "poyo", also: ["apimart"] },
  "seedance-2-fast":        { primary: "poyo", also: ["apimart"] },
  // `doubao-seedance-2.0` IS ApiMart's native wire name for the same
  // model Poyo ships as `seedance-2` (see MODEL_ALIASES). Poyo does not
  // recognize `doubao-seedance-2.0` as a model ID — it 404s. So this
  // canonical ID must be ApiMart-primary; the Poyo path is unreachable.
  "doubao-seedance-2.0":    { primary: "apimart" },
  "doubao-seedance-2.0-face":{ primary: "apimart" },
  "doubao-seedance-2.0-fast-face":{ primary: "apimart" },
  "hailuo-2.3":             { primary: "apimart", also: ["poyo"], gateToApimart: ["camera_movement_set"] },
  "MiniMax-Hailuo-2.3-Fast":{ primary: "apimart" },
  "wan2.6-text-to-video":   { primary: "apimart", also: ["poyo"], gateToApimart: ["template_set"] },
  "wan2.6-image-to-video":  { primary: "apimart", also: ["poyo"], gateToApimart: ["template_set"] },
  "wan2.6-video-to-video":  { primary: "poyo" },
  "wan2.6-i2v-flash":       { primary: "apimart" },
  "grok-vid":               { primary: "apimart", also: ["poyo"] },
  "runway-gen-4.5":         { primary: "poyo" },
}

// -------------------------------------------------------------------
// MODEL_ALIASES — cross-provider wire name translation.
//
// Some upstream models exist on both providers under different canonical
// IDs (verified 2026-04-17 against https://apimart.ai/api/pricing). The
// studio picks ONE canonical ID per upstream model (the Poyo name by
// convention); the dispatcher translates to the opposite provider's wire
// name when the router chooses ApiMart / falls back to ApiMart.
//
// Add here ONLY when the same upstream model ships under different IDs.
// Do NOT add here for capability-gated variants (those are separate rows
// in MODEL_PROVIDERS with their own routing).
// -------------------------------------------------------------------

export const MODEL_ALIASES: Record<string, Partial<Record<StudioProvider, string>>> = {
  "seedance-2":        { apimart: "doubao-seedance-2.0" },
  "seedance-2-fast":   { apimart: "doubao-seedance-2.0-fast" },
}

export function resolveProviderModelId(
  canonical: string,
  provider: StudioProvider,
): string {
  const mapped = MODEL_ALIASES[canonical]?.[provider]
  return mapped ?? canonical
}

// -------------------------------------------------------------------
// Legacy sets — kept for back-compat with any consumers that still
// read these. Populated from MODEL_PROVIDERS so they can't drift.
// -------------------------------------------------------------------

const IMAGE_MODEL_IDS = new Set<string>([
  "nano-banana", "nano-banana-2", "nano-banana-2-new", "nano-banana-2-official", "nano-banana-pro",
  "gpt-4o-image", "gpt-image-1.5",
  "flux-2-pro", "flux-2-flex", "flux-kontext-pro", "flux-kontext-max",
  "seedream-4.5", "seedream-5.0-lite",
  "z-image", "qwen-image-2.0-pro",
  "grok-imagine-image", "wan-2.7-image-pro",
  "kling-o3-image", "kling-o3-image-edit",
])

export const APIMART_IMAGE_MODELS = new Set<string>(
  Object.entries(MODEL_PROVIDERS)
    .filter(([id, entry]) => IMAGE_MODEL_IDS.has(id) && (entry.primary === "apimart" || entry.also?.includes("apimart")))
    .map(([id]) => id),
)

export const APIMART_VIDEO_MODELS = new Set<string>(
  Object.entries(MODEL_PROVIDERS)
    .filter(([id, entry]) => !IMAGE_MODEL_IDS.has(id) && (entry.primary === "apimart" || entry.also?.includes("apimart")))
    .map(([id]) => id),
)

// -------------------------------------------------------------------
// Fallback map — Step 7 (handoff §13).
//
// Derived directly from MODEL_PROVIDERS so it can't drift. Rule: if a
// model lists `also` containing the opposite provider, the fallback is
// the same model id on that opposite provider (because the same model
// id exists on both providers). Models without an `also` entry have no
// cross-provider fallback and are intentionally absent — the caller
// will surface a hard failure rather than route to a different model.
// -------------------------------------------------------------------

const FALLBACK_MAP: Record<string, ProviderFallbackPlan> = (() => {
  const map: Record<string, ProviderFallbackPlan> = {}
  for (const [modelId, entry] of Object.entries(MODEL_PROVIDERS)) {
    const opposite: StudioProvider = entry.primary === "apimart" ? "poyo" : "apimart"
    if (entry.also?.includes(opposite)) {
      map[modelId] = {
        provider: opposite,
        model: modelId,
        reason: `Routes to the ${opposite} mirror of ${modelId} when ${entry.primary} is unavailable.`,
      }
    }
  }
  return map
})()

// -------------------------------------------------------------------
// Watchlist — models with historical provider-side pressure.
// Surfaced as "watch" health in getProviderRoutingDecision so the UI
// can soften expectations on retry latency.
// -------------------------------------------------------------------

const WATCH_MODELS = new Set([
  "sora-2",
  "sora-2-pro",
  "sora-2-official",
  "veo3.1-fast",
  "veo3.1-quality",
  "gpt-4o-image",
  "gpt-image-1.5",
])

// -------------------------------------------------------------------
// EXTREME_AR_SET — used for nano-banana-2 gate
// Aspect ratios only ApiMart accepts on the Nano Banana 2 family.
// -------------------------------------------------------------------

const EXTREME_AR_SET = new Set(["1:4", "4:1", "1:8", "8:1"])

function hasExtremeAr(ratio?: string): boolean {
  if (!ratio) return false
  return EXTREME_AR_SET.has(ratio.trim())
}

function isHalfKResolution(res?: string): boolean {
  if (!res) return false
  const value = res.trim().toLowerCase()
  return value === "0.5k" || value === "512" || value === "512p"
}

// -------------------------------------------------------------------
// Stage 2 helpers — evaluate param-triggered gates.
// Returns a provider override string or null if no gate triggers.
// -------------------------------------------------------------------

function evaluateGate(
  gate: ProviderGate,
  input: ProviderRoutingInput,
): boolean {
  const p = input.params || {}
  switch (gate) {
    case "n>1":
      return typeof p.n === "number" && p.n > 1
    case "n<=4 && need_apimart_behavior":
      return false // conservative: only trip when caller asks; placeholder
    case "extreme_ar":
      return hasExtremeAr(p.aspect_ratio)
    case "res=0.5K":
      return isHalfKResolution(p.resolution)
    case "remix":
      return input.mode === "remix" || Boolean(input.wantsRemix)
    case "character":
      return Boolean(input.needsCharacterReference)
    case "preview":
      return p.official_tier === false
    case "vip":
      return false // VIP tier is a separate model id (sora-2-vip); not a param gate
    case "official_tier":
      return p.official_tier === true
    case "kling_elements":
      return Array.isArray(p.kling_elements) ? p.kling_elements.length > 0 : Boolean(p.kling_elements)
    case "generation_type=reference":
      return p.generation_type === "reference"
    case "need_last_frame_image_without_pro_mode":
      return Boolean(p.last_frame_image)
    case "template_set":
      return Boolean(p.template && p.template.length > 0)
    case "camera_movement_set":
      return Boolean(p.camera_movement && p.camera_movement.length > 0)
    case "mask_url":
      return Boolean(p.mask_url)
    default:
      return false
  }
}

function applyGates(entry: ModelProviderEntry, input: ProviderRoutingInput): StudioProvider | null {
  if (entry.gateToApimart) {
    for (const gate of entry.gateToApimart) {
      if (evaluateGate(gate, input)) return "apimart"
    }
  }
  if (entry.gateToPoyo) {
    for (const gate of entry.gateToPoyo) {
      if (evaluateGate(gate, input)) return "poyo"
    }
  }
  return null
}

// -------------------------------------------------------------------
// chooseProvider — 4-stage router (replaces the old switch-based logic)
// -------------------------------------------------------------------

export function chooseProvider(input: ProviderRoutingInput): StudioProvider {
  // Stage 1 — Hard capability gates that are independent of the model map.
  //   Character reference and remix flows require ApiMart because only ApiMart
  //   exposes the character-extract + remix task endpoints today.
  if (input.needsCharacterReference) return "apimart"
  if (input.mode === "remix") return "apimart"

  const entry = input.model ? MODEL_PROVIDERS[input.model] : undefined

  // Unknown model — fall back to the pre-rewrite defaults so new models
  // added without a map entry still resolve somewhere.
  if (!entry) {
    if (input.mode === "video") {
      if (input.wantsRemix) return "apimart"
      return "poyo"
    }
    return "poyo"
  }

  // Stage 2 — Param-driven gate overrides (provider forced regardless of price).
  const gated = applyGates(entry, input)
  if (gated) return gated

  // Stage 3 — Primary from the map (price-preferred default).
  let primary: StudioProvider = entry.primary

  // Stage 4 — Health-aware preemptive fallback. Only switch if the model
  //   actually exists on the other provider (entry.also).
  if (input.liveHealth === "down" || input.liveHealth === "degraded") {
    const secondary = entry.also?.find((p) => p !== primary)
    if (secondary) primary = secondary
  }

  return primary
}

// -------------------------------------------------------------------
// getProviderRoutingDecision — public surface used by left-panel.tsx
// -------------------------------------------------------------------

export function getProviderRoutingDecision(input: ProviderRoutingInput): ProviderRoutingDecision {
  const provider = chooseProvider(input)
  const notes: string[] = []
  const fallback =
    input.needsCharacterReference
      ? undefined
      : input.model
        ? FALLBACK_MAP[input.model]
        : undefined

  if (provider === "apimart") {
    notes.push("Direct provider route with polling-based task tracking.")
  } else {
    notes.push("Callable-function route with existing Firebase-backed Studio jobs.")
  }

  if (input.mode === "remix") {
    notes.push("Remix flows stay on ApiMart so task IDs and asset lineage remain intact.")
  }

  if (input.needsCharacterReference) {
    notes.push("Character-reference execution is pinned to ApiMart for identity consistency.")
  }

  if (input.hasReferenceImage) {
    notes.push("Reference media will be uploaded to Firebase Storage before submission.")
  }

  const entry = input.model ? MODEL_PROVIDERS[input.model] : undefined
  if (entry && input.model) {
    const gated = applyGates(entry, input)
    if (gated && gated !== entry.primary) {
      notes.push(`Routed to ${gated} because the requested configuration is only available there.`)
    }
  }

  if (input.liveHealth === "down") {
    notes.push("Live telemetry shows this provider is currently failing requests.")
  } else if (input.liveHealth === "degraded") {
    notes.push("Live telemetry shows slower or inconsistent provider responses right now.")
  } else if (input.liveHealth === "healthy") {
    notes.push("Live telemetry confirms the provider is currently responsive.")
  }

  if (fallback) {
    return {
      provider,
      health: input.liveHealth === "healthy" ? "stable" : "fallback-ready",
      fallback,
      notes: [...notes, fallback.reason],
    }
  }

  if (input.liveHealth === "down" || input.liveHealth === "degraded") {
    return {
      provider,
      health: "watch",
      notes,
    }
  }

  if (input.model && WATCH_MODELS.has(input.model)) {
    return {
      provider,
      health: "watch",
      notes: [...notes, "This model has seen intermittent provider-side pressure, so retries may be slower."],
    }
  }

  return {
    provider,
    health: "stable",
    notes,
  }
}

export function validateStudioExecution(input: StudioExecutionValidationInput) {
  const errors: string[] = []
  const warnings: string[] = []
  const capability = input.capability

  if (capability?.supportsPrompt !== false && !input.prompt?.trim()) {
    errors.push("Add a prompt before generating.")
  }

  if (input.mode === "remix" && !input.hasReferenceImage && !input.hasReferenceVideo) {
    errors.push("Remix needs a source image or video first.")
  }

  if (capability?.requiresReferenceImage && !input.hasReferenceImage) {
    errors.push("This model requires a reference image before it can run.")
  }

  if (capability?.requiresReferenceVideo && !input.hasReferenceVideo) {
    errors.push("This model requires a reference video before it can run.")
  }

  if (input.mode === "video" && input.hasReferenceVideo && !input.hasReferenceImage && capability?.requiresReferenceImage) {
    warnings.push("This motion workflow works best when you provide both the driving image and the reference video.")
  }

  return { errors, warnings }
}

export function getProviderFallback(model?: string) {
  if (!model) return undefined
  return FALLBACK_MAP[model]
}

/**
 * Quick predicate exported for the 2-step AR pipeline (handoff §10).
 * Returns true when the request would benefit from a reframing image
 * edit before video submission. Caller still has to confirm AR mismatch
 * via decideTwoStep in lib/studio-two-step.ts — this only answers the
 * model-level question. (The env flag was removed in Sprint A Phase 1;
 * the pipeline is now auto-triggered.)
 */
export function needsTwoStepPipeline(input: {
  mode: "image" | "video" | "remix"
  hasReferenceImage?: boolean
  modelIgnoresArOnRef?: boolean
}): boolean {
  if (input.mode !== "video") return false
  if (!input.hasReferenceImage) return false
  return Boolean(input.modelIgnoresArOnRef)
}

export function isRetryableProviderFailure(error: unknown) {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  return (
    message.includes("503") ||
    message.includes("temporarily unavailable") ||
    message.includes("capacity") ||
    message.includes("overloaded") ||
    message.includes("timeout") ||
    message.includes("rate limit") ||
    message.includes("429")
  )
}
