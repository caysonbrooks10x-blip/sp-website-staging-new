import type { ProviderHealthStatus } from "@/lib/provider-health"

export type StudioProvider = "poyo" | "apimart" | "fal"

// -------------------------------------------------------------------
// FAL_APP_MAP — StudioX canonical model id → Fal app endpoint slug.
//
// Verified 2026-04-28 by probing https://queue.fal.run/{slug} with the
// Studio API key. Only models that returned 200 are listed here; models
// not on Fal's catalog (gpt-4o-image, veo3.1-*, runway-gen-4.5, grok-*)
// are intentionally absent so they never resolve to a fal route.
//
// For models with separate text-to-video and image-to-video endpoints,
// the dispatcher in provider-router.ts picks the right slug at submit
// time based on whether reference images are present.
// -------------------------------------------------------------------

export interface FalAppEntry {
  // Default endpoint (text-to-image / text-to-video).
  appId: string
  // Optional image-to-* endpoint when the model exposes both.
  i2vAppId?: string
  // Optional edit endpoint for image models that support reference editing.
  editAppId?: string
}

export const FAL_APP_MAP: Record<string, FalAppEntry> = {
  // IMAGE — verified by endpoint probe 2026-04-29
  "nano-banana":            { appId: "fal-ai/nano-banana", editAppId: "fal-ai/nano-banana/edit" },
  "nano-banana-2":          { appId: "fal-ai/nano-banana-2" },
  "nano-banana-2-new":      { appId: "fal-ai/nano-banana-2" },
  "nano-banana-2-official": { appId: "fal-ai/gemini-3.1-flash-image-preview" },
  "nano-banana-pro":        { appId: "fal-ai/nano-banana-pro", editAppId: "fal-ai/nano-banana-pro/edit" },
  "flux-2-pro":             { appId: "fal-ai/flux-pro/v1.1" },
  "flux-2-flex":            { appId: "fal-ai/flux/dev" },
  "flux-kontext-pro":       { appId: "fal-ai/flux-kontext/pro/text-to-image" },
  "flux-kontext-max":       { appId: "fal-ai/flux-kontext/max/text-to-image" },
  "seedream-4.5":           { appId: "fal-ai/bytedance/seedream/v4/text-to-image" },
  "seedream-5.0-lite":      { appId: "fal-ai/bytedance/seedream/v5-lite/text-to-image" },
  "qwen-image-2.0-pro":     { appId: "fal-ai/qwen-image" },
  "wan-2.7-image-pro":      { appId: "fal-ai/wan/v2.7-image-pro/text-to-image" },
  "z-image":                { appId: "fal-ai/z-image" },
  "kling-o3-image":         { appId: "fal-ai/kling/v3/text-to-image" },
  "gpt-image-1.5":          { appId: "fal-ai/gpt-image-1.5" },
  "gpt-image-2":            { appId: "fal-ai/gpt-image-1" },
  "grok-imagine-image":     { appId: "fal-ai/xai/grok-imagine" },

  // VIDEO — verified by endpoint probe 2026-04-29
  "seedance-2":             {
    appId: "fal-ai/bytedance/seedance/v2/pro/text-to-video",
    i2vAppId: "fal-ai/bytedance/seedance/v2/pro/image-to-video",
  },
  "doubao-seedance-2.0":    { appId: "fal-ai/bytedance/doubao-seedance/v2" },
  "veo3.1-lite":            { appId: "fal-ai/veo3" },
  "veo3.1-fast-official":   { appId: "fal-ai/veo3.1" },
  "veo3.1-quality-official":{ appId: "fal-ai/veo3.1" },
  "kling-v3-omni":          { appId: "fal-ai/kling-video/v3/master/text-to-video" },
  "kling-video-o1":         { appId: "fal-ai/kling-video/o1/text-to-video" },
  "hailuo-2.3":             { appId: "fal-ai/minimax/hailuo-2.3/text-to-video" },
  "wan2.6-text-to-video":   { appId: "fal-ai/wan/v2.6/text-to-video" },
  "wan2.6-video-to-video":  { appId: "fal-ai/wan/v2.6/video-to-video" },
  "sora-2":                 { appId: "fal-ai/sora-2" },
  "grok-vid":               { appId: "fal-ai/xai/grok-imagine" },
  // runway-gen-4.5 falls back to Fal's older runway-gen3 generation —
  // different model class but keeps the user from hard failure when Poyo
  // is degraded.
  "runway-gen-4.5":         { appId: "fal-ai/runway-gen3" },
}

export function resolveFalAppId(canonical: string, kind: "default" | "i2v" | "edit" = "default"): string | undefined {
  const entry = FAL_APP_MAP[canonical]
  if (!entry) return undefined
  if (kind === "i2v") return entry.i2vAppId ?? entry.appId
  if (kind === "edit") return entry.editAppId ?? entry.appId
  return entry.appId
}

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

// -------------------------------------------------------------------
// MODEL_PROVIDERS routing rules (updated 2026-04-28 to add Fal.ai)
//
// Fal.ai is added as the LAST entry in `also` for every model whose
// upstream is verified-present in FAL_APP_MAP above. Models not on Fal
// keep their existing two-provider routing untouched. Per user direction,
// Fal is never primary EXCEPT for `seedance-2` where Poyo + ApiMart's
// real-person-likeness moderation has been blocking generations and
// Fal accepts the same model without that wrapper.
// -------------------------------------------------------------------

export const MODEL_PROVIDERS: Record<string, ModelProviderEntry> = {
  // IMAGE
  "nano-banana":            { primary: "apimart", also: ["poyo", "fal"], gateToApimart: ["n>1"] },
  "nano-banana-2":          { primary: "apimart", also: ["poyo", "fal"], gateToApimart: ["n>1", "extreme_ar", "res=0.5K"] },
  "nano-banana-2-new":      { primary: "apimart", also: ["poyo", "fal"], gateToApimart: ["n>1", "extreme_ar", "res=0.5K"] },
  "nano-banana-2-official": { primary: "apimart", also: ["fal"], gateToPoyo: ["res=0.5K"] },
  "nano-banana-pro":        { primary: "poyo", also: ["fal"] },
  "gpt-4o-image":           { primary: "apimart", also: ["poyo"], gateToApimart: ["mask_url"] },
  "gpt-image-1.5":          { primary: "poyo", also: ["fal"], gateToApimart: ["official_tier", "mask_url"] },
  "flux-2-pro":             { primary: "apimart", also: ["poyo", "fal"] },
  "flux-2-flex":            { primary: "apimart", also: ["poyo", "fal"] },
  "flux-kontext-pro":       { primary: "apimart", also: ["poyo", "fal"] },
  "flux-kontext-max":       { primary: "apimart", also: ["poyo", "fal"] },
  "seedream-4.5":           { primary: "poyo", also: ["apimart", "fal"] },
  "seedream-5.0-lite":      { primary: "poyo", also: ["apimart", "fal"], gateToApimart: ["n<=4 && need_apimart_behavior"] },
  "z-image":                { primary: "poyo", also: ["fal"] },
  "qwen-image-2.0-pro":     { primary: "apimart", also: ["fal"] },
  "grok-imagine-image":     { primary: "apimart", also: ["poyo", "fal"] },
  "wan-2.7-image-pro":      { primary: "poyo", also: ["fal"] },
  "kling-o3-image":         { primary: "poyo", also: ["fal"] },
  "gpt-image-2":            { primary: "poyo", also: ["apimart", "fal"] },

  // VIDEO
  "sora-2":                 { primary: "apimart", also: ["fal"] },
  "sora-2-pro":             { primary: "apimart" },
  "sora-2-official":        { primary: "poyo" },
  "veo3.1-lite":            { primary: "apimart", also: ["fal"] },
  "veo3.1-fast-official":   { primary: "apimart", also: ["fal"] },
  "veo3.1-quality-official":{ primary: "apimart", also: ["fal"] },
  "kling-v3-omni":          { primary: "apimart", also: ["fal"] },
  "kling-video-o1":         { primary: "apimart", also: ["fal"] },
  // Seedance 2: Fal-primary per user direction 2026-04-28. Both Poyo and
  // ApiMart wrap this model with real-person-likeness moderation that
  // rejects the most-requested workflows; Fal hosts the same upstream
  // ByteDance Seedance v2 endpoint without that wrapper.
  "seedance-2":             { primary: "fal", also: ["poyo", "apimart"] },
  "doubao-seedance-2.0":    { primary: "apimart", also: ["poyo", "fal"] },
  "hailuo-2.3":             { primary: "apimart", also: ["poyo", "fal"], gateToApimart: ["camera_movement_set"] },
  "wan2.6-text-to-video":   { primary: "apimart", also: ["poyo", "fal"], gateToApimart: ["template_set"] },
  "wan2.6-video-to-video":  { primary: "poyo", also: ["fal"] },
  "grok-vid":               { primary: "apimart", also: ["poyo", "fal"] },
  "runway-gen-4.5":         { primary: "poyo", also: ["fal"] },
}

// -------------------------------------------------------------------
// MODEL_ALIASES — cross-provider wire name translation.
//
// Some upstream models exist on both providers under different canonical
// IDs (verified 2026-04-22 against https://apimart.ai/api/pricing). The
// studio picks ONE canonical ID per upstream model (the Poyo name by
// convention); the dispatcher translates to the opposite provider's wire
// name when the router chooses ApiMart / falls back to ApiMart.
//
// Add here ONLY when the same upstream model ships under different IDs.
// Do NOT add here for capability-gated variants (those are separate rows
// in MODEL_PROVIDERS with their own routing).
// -------------------------------------------------------------------

export const MODEL_ALIASES: Record<string, Partial<Record<StudioProvider, string>>> = {
  // ApiMart exposes the Nano Banana family under Gemini wire IDs.
  // Studio keeps the Nano Banana names as the canonical UX IDs and
  // translates only at submit-time when ApiMart is chosen.
  "nano-banana": {
    apimart: "gemini-2.5-flash-image-preview",
  },
  "nano-banana-2": {
    apimart: "gemini-3.1-flash-image-preview",
  },
  // "Nano Banana 2 (New)" is a Studio-facing catalog label for the same
  // upstream Gemini 3.1 image model as `nano-banana-2`; both rows resolve
  // to the identical ApiMart wire name. Kept as a distinct Studio entry
  // only for UX surfacing. On Poyo the two do currently ship under
  // separate doc pages, so no Poyo alias is needed.
  "nano-banana-2-new": {
    apimart: "gemini-3.1-flash-image-preview",
  },
  "nano-banana-2-official": {
    apimart: "gemini-3.1-flash-image-preview-official",
  },

  // Hailuo: Poyo uses plain `hailuo-2.3`; ApiMart canonicalizes under the
  // MiniMax vendor prefix.
  "hailuo-2.3": {
    apimart: "MiniMax-Hailuo-2.3",
  },

  // Grok video / image: ApiMart publishes the xAI family with explicit
  // version + `-apimart` suffix. Studio keeps the short marketing names.
  "grok-vid": {
    apimart: "grok-imagine-1.0-video-apimart",
  },
  "grok-imagine-image": {
    apimart: "grok-imagine-1.0-apimart",
  },

  // Wan 2.6: Poyo splits by modality (`wan2.6-text-to-video`,
  // `wan2.6-image-to-video`); ApiMart collapses text-to-video under plain
  // `wan2.6` (image-to-video is `wan2.6-i2v`, Poyo-only in Studio today).
  "wan2.6-text-to-video": {
    apimart: "wan2.6",
  },

  // Seedance 2: Studio exposes the clean customer name while ApiMart uses
  // ByteDance/Doubao's upstream wire ID for the same generation family.
  "seedance-2": {
    apimart: "doubao-seedance-2.0",
  },
  "doubao-seedance-2.0": {
    poyo: "seedance-2",
  },

  // Seedream 5 Lite: ApiMart publishes the ByteDance vendor ID
  // `doubao-seedream-5-0-lite`; Studio keeps the Poyo short name as
  // canonical. Fixes a prior drift where submits to ApiMart were sending
  // the literal `seedream-5.0-lite` and hitting a 404.
  "seedream-5.0-lite": {
    apimart: "doubao-seedream-5-0-lite",
  },

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
  "kling-o3-image",
  "gpt-image-2",
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

// Build the fallback CHAIN per model. The chain is `[primary, ...also]`
// dedup'd with primary at index 0 — `getProviderFallback` returns index
// 1 (first non-primary) for back-compat, and `getProviderFallbackChain`
// returns the full ordered list for callers that want multi-step retry.
const FALLBACK_CHAIN: Record<string, StudioProvider[]> = (() => {
  const map: Record<string, StudioProvider[]> = {}
  for (const [modelId, entry] of Object.entries(MODEL_PROVIDERS)) {
    const seen = new Set<StudioProvider>()
    const chain: StudioProvider[] = []
    const push = (p: StudioProvider) => {
      if (!seen.has(p)) {
        seen.add(p)
        chain.push(p)
      }
    }
    push(entry.primary)
    for (const p of entry.also ?? []) push(p)
    map[modelId] = chain
  }
  return map
})()

const FALLBACK_MAP: Record<string, ProviderFallbackPlan> = (() => {
  const map: Record<string, ProviderFallbackPlan> = {}
  for (const [modelId, chain] of Object.entries(FALLBACK_CHAIN)) {
    if (chain.length < 2) continue
    const primary = chain[0]
    const next = chain[1]
    map[modelId] = {
      provider: next,
      model: modelId,
      reason: `Routes to the ${next} mirror of ${modelId} when ${primary} is unavailable.`,
    }
  }
  return map
})()

export function getProviderFallbackChain(model?: string): StudioProvider[] {
  if (!model) return []
  return FALLBACK_CHAIN[model] ?? []
}

// -------------------------------------------------------------------
// Watchlist — models with historical provider-side pressure.
// Surfaced as "watch" health in getProviderRoutingDecision so the UI
// can soften expectations on retry latency.
// -------------------------------------------------------------------

const WATCH_MODELS = new Set([
  "sora-2-official",
  "gpt-4o-image",
  "gpt-image-1.5",
])

// Nano Banana base models accept reference images on both providers, but
// the current Studio edit flow is more reliable on Poyo for reference-image
// jobs. Keep text-only generations on the normal price-preferred path.
const NANO_BANANA_REFERENCE_PREFERRED_POYO = new Set([
  "nano-banana",
  "nano-banana-2",
  "nano-banana-2-new",
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

  if (
    input.mode === "image" &&
    input.hasReferenceImage &&
    input.model &&
    NANO_BANANA_REFERENCE_PREFERRED_POYO.has(input.model)
  ) {
    if (
      (input.liveHealth === "down" || input.liveHealth === "degraded") &&
      entry.also?.includes("apimart")
    ) {
      return "apimart"
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
