export type StudioProvider = "poyo" | "apimart"

export interface ProviderRoutingInput {
  mode: "image" | "video" | "remix"
  model?: string
  wantsRemix?: boolean
  hasReferenceImage?: boolean
}

const APIMART_VIDEO_MODELS = new Set([
  "sora-2",
  "sora-2-pro",
  "sora-2-official",
  "veo3.1-fast",
  "veo3.1-quality",
  "kling-3.0/standard",
  "kling-3.0/pro",
  "kling-3.0-motion-control",
  "kling-2.6",
  "kling-2.5-turbo-pro",
  "hailuo-02",
  "hailuo-02-pro",
  "hailuo-2.3",
  "wan2.6-text-to-video",
  "wan2.6-image-to-video",
  "wan-animate-replace",
  "wan-animate-move",
  "seedance-1.0-pro",
  "seedance-1.5-pro",
])

const APIMART_IMAGE_MODELS = new Set([
  "gpt-4o-image",
  "gpt-image-1.5",
  "nano-banana",
  "nano-banana-2",
  "nano-banana-2-new",
  "seedream-4",
  "seedream-4.5",
  "seedream-5.0-lite",
  "flux-kontext-pro",
  "flux-kontext-max",
  "z-image",
  "grok-imagine-image",
])

export function chooseProvider(input: ProviderRoutingInput): StudioProvider {
  if (input.mode === "remix") return "apimart"

  if (input.mode === "video") {
    if (input.wantsRemix) return "apimart"
    if (input.model && APIMART_VIDEO_MODELS.has(input.model)) return "apimart"
    return "poyo"
  }

  if (input.mode === "image") {
    if (input.model && APIMART_IMAGE_MODELS.has(input.model)) return "apimart"
    return "poyo"
  }

  return "poyo"
}
