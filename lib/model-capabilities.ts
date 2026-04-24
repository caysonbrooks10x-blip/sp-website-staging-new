/**
 * Per-model validation layer — Sprint A Step 2.
 *
 * Every Studio generation MUST call validateModelParams before the
 * request leaves the process. We reject invalid inputs here so the
 * provider never sees a combination it will silently misinterpret
 * (e.g. passing a 0.5K resolution to a model that doesn't expose it,
 * or requesting n=4 on a model that caps at 1).
 *
 * The registry leans on sensible family-level defaults; individual
 * models only list overrides. If a model is missing from the registry,
 * the loose defaults apply — the validator never hard-blocks an
 * unregistered model, it just skips the per-model checks.
 */

export type ModelKind = "image" | "video"

export interface ModelCapability {
  kind: ModelKind
  aspectRatios?: string[]
  resolutions?: string[]
  durations?: number[]
  nMin?: number
  nMax?: number
  requiresReferenceImage?: boolean
  forbidsReferenceImage?: boolean
  /** Inclusive upper bound on reference image count. Enforced when
   *  ValidateRefs.referenceImageCount is provided by the caller. */
  maxReferenceImages?: number
  ignoresArOnRef?: boolean
  supportsSeed?: boolean
  /** Pairs/groups of parameter names that cannot co-exist. Example:
   *  Seedream rejects resolution + aspect_ratio together. */
  mutex?: string[][]
}

export interface ValidateParams {
  /** Text prompt. Required for most generation modes; the validator
   *  rejects empty strings when prompt is passed explicitly. */
  prompt?: string
  aspect_ratio?: string
  resolution?: string
  duration?: number | string
  n?: number
  seed?: number | string
  last_frame_image?: string
  mask_url?: string
  kling_elements?: unknown
  template?: string
  camera_movement?: string
  generation_type?: string
  [key: string]: unknown
}

export interface ValidateRefs {
  hasReferenceImage?: boolean
  hasReferenceVideo?: boolean
  /** Concrete reference image count if known. Enforced against
   *  capability.maxReferenceImages. */
  referenceImageCount?: number
}

const COMMON_IMAGE_AR = ["1:1", "3:4", "4:3", "9:16", "16:9", "2:3", "3:2"]
const EXTREME_AR = ["1:4", "4:1", "1:8", "8:1"]
const COMMON_VIDEO_AR = ["9:16", "16:9", "1:1"]

const IMAGE_DEFAULT: ModelCapability = {
  kind: "image",
  aspectRatios: COMMON_IMAGE_AR,
  resolutions: ["1K", "2K", "1080p", "720p"],
  nMin: 1,
  nMax: 4,
  supportsSeed: true,
}

const VIDEO_DEFAULT: ModelCapability = {
  kind: "video",
  aspectRatios: COMMON_VIDEO_AR,
  resolutions: ["720p", "1080p"],
  durations: [5, 10],
  nMin: 1,
  nMax: 1,
  ignoresArOnRef: true,
  supportsSeed: false,
}

const nanoBananaCaps: ModelCapability = {
  ...IMAGE_DEFAULT,
  aspectRatios: [...COMMON_IMAGE_AR, ...EXTREME_AR],
  resolutions: ["0.5K", "1K", "2K", "1080p"],
  nMax: 4,
  maxReferenceImages: 4,
}

// Seedream forbids passing both `resolution` and `aspect_ratio` on the
// same request — the provider only honours one of them. Call-sites
// must pick one; the validator rejects the combo before dispatch.
const seedreamCaps: ModelCapability = {
  ...IMAGE_DEFAULT,
  mutex: [["resolution", "aspect_ratio"]],
  maxReferenceImages: 4,
}

const klingVideoCaps: ModelCapability = {
  ...VIDEO_DEFAULT,
  durations: [5, 10],
  mutex: [["kling_elements", "last_frame_image"]],
}

const kling30Caps: ModelCapability = {
  ...VIDEO_DEFAULT,
  durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  mutex: [["kling_elements", "last_frame_image"]],
}

const seedanceCaps: ModelCapability = {
  ...VIDEO_DEFAULT,
  durations: [5, 10, 12],
}

const seedancePoyoCaps: ModelCapability = {
  ...VIDEO_DEFAULT,
  durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  aspectRatios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
  resolutions: ["480p", "720p", "1080p"],
  maxReferenceImages: 2,
}

const doubaoSeedanceCaps: ModelCapability = {
  ...VIDEO_DEFAULT,
  durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  aspectRatios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
  resolutions: ["480p", "720p", "1080p"],
  maxReferenceImages: 2,
}

const soraCaps: ModelCapability = {
  ...VIDEO_DEFAULT,
  durations: [4, 8, 12],
  aspectRatios: ["9:16", "16:9"],
}

const soraStudioCaps: ModelCapability = {
  ...VIDEO_DEFAULT,
  durations: [10, 15],
  aspectRatios: ["9:16", "16:9"],
}

const soraProStudioCaps: ModelCapability = {
  ...VIDEO_DEFAULT,
  durations: [15, 25],
  aspectRatios: ["9:16", "16:9"],
}

const soraOfficialCaps: ModelCapability = {
  ...VIDEO_DEFAULT,
  durations: [4, 8, 12, 16, 20],
  aspectRatios: ["9:16", "16:9"],
  maxReferenceImages: 1,
}

const veoCaps: ModelCapability = {
  ...VIDEO_DEFAULT,
  durations: [8],
  aspectRatios: ["9:16", "16:9"],
}

const veoLiteCaps: ModelCapability = {
  ...VIDEO_DEFAULT,
  durations: [5, 8],
  aspectRatios: ["9:16", "16:9"],
  resolutions: ["720p", "1080p"],
}

const veoFastCaps: ModelCapability = {
  ...veoCaps,
  resolutions: ["720p", "1080p", "4k"],
}

const veoQualityCaps: ModelCapability = {
  ...veoCaps,
  resolutions: ["720p", "1080p", "4k"],
}

const grokVidCaps: ModelCapability = {
  ...VIDEO_DEFAULT,
  durations: [6, 10],
  aspectRatios: ["1:1", "2:3", "3:2", "16:9", "9:16"],
}

const hailuoCaps: ModelCapability = {
  ...VIDEO_DEFAULT,
  durations: [6, 10],
  resolutions: ["768p", "1080p"],
}

const wan26TextCaps: ModelCapability = {
  ...VIDEO_DEFAULT,
  durations: [5, 10, 15],
}

const wan26VideoToVideoCaps: ModelCapability = {
  ...VIDEO_DEFAULT,
  durations: [5, 8],
}

const wan26I2VFlashCaps: ModelCapability = {
  ...VIDEO_DEFAULT,
  durations: [5, 8],
  resolutions: ["480p", "720p"],
  requiresReferenceImage: true,
}

export const MODEL_CAPABILITIES: Record<string, ModelCapability> = {
  // image family
  "nano-banana": nanoBananaCaps,
  "nano-banana-2": nanoBananaCaps,
  "nano-banana-2-new": nanoBananaCaps,
  "nano-banana-2-new-edit": { ...nanoBananaCaps, requiresReferenceImage: true },
  "nano-banana-2-official": { ...nanoBananaCaps, resolutions: ["1K", "2K"] },
  "nano-banana-pro": { ...IMAGE_DEFAULT, resolutions: ["1K", "2K", "4K"] },
  "gpt-4o-image": { ...IMAGE_DEFAULT, nMax: 4 },
  "gpt-image-1.5": { ...IMAGE_DEFAULT, nMax: 4 },
  "gpt-image-2": { ...IMAGE_DEFAULT, nMax: 4 },
  "flux-2-pro": IMAGE_DEFAULT,
  "flux-2-flex": IMAGE_DEFAULT,
  "flux-kontext-pro": { ...IMAGE_DEFAULT, requiresReferenceImage: true },
  "flux-kontext-max": { ...IMAGE_DEFAULT, requiresReferenceImage: true },
  "seedream-4.5": seedreamCaps,
  "seedream-5.0-lite": seedreamCaps,
  "z-image": IMAGE_DEFAULT,
  "qwen-image-2.0-pro": IMAGE_DEFAULT,
  "grok-imagine-image": IMAGE_DEFAULT,
  "wan-2.7-image-pro": IMAGE_DEFAULT,
  "kling-o3-image": IMAGE_DEFAULT,
  "gemini-3.1-flash-image-preview": { ...IMAGE_DEFAULT, aspectRatios: [...COMMON_IMAGE_AR, ...EXTREME_AR] },

  // video family
  "sora-2": soraStudioCaps,
  "sora-2-pro": soraProStudioCaps,
  "sora-2-official": soraOfficialCaps,
  "veo3.1-lite": veoLiteCaps,
  "veo3.1-fast": veoFastCaps,
  "veo3.1-quality": veoQualityCaps,
  "veo3.1-fast-official": veoCaps,
  "veo3.1-quality-official": veoCaps,
  "kling-2.6": klingVideoCaps,
  "kling-3.0/standard": kling30Caps,
  "kling-3.0/pro": kling30Caps,
  "kling-v3-omni": klingVideoCaps,
  "kling-video-o1": klingVideoCaps,
  "seedance-2": seedancePoyoCaps,
  "seedance-2-fast": seedancePoyoCaps,
  "doubao-seedance-2.0": doubaoSeedanceCaps,
  "doubao-seedance-2.0-face": { ...seedancePoyoCaps, requiresReferenceImage: true },
  "doubao-seedance-2.0-fast-face": { ...seedancePoyoCaps, requiresReferenceImage: true },
  "hailuo-2.3": hailuoCaps,
  "MiniMax-Hailuo-2.3-Fast": hailuoCaps,
  "wan2.6-text-to-video": wan26TextCaps,
  "wan2.6-image-to-video": { ...wan26TextCaps, requiresReferenceImage: true },
  "wan2.6-video-to-video": wan26VideoToVideoCaps,
  "wan2.6-i2v-flash": wan26I2VFlashCaps,
  "grok-vid": grokVidCaps,
  "runway-gen-4.5": VIDEO_DEFAULT,
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
  warnings: string[]
  capability?: ModelCapability
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

export function validateModelParams(
  modelId: string | undefined,
  params: ValidateParams = {},
  refs: ValidateRefs = {},
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!modelId) {
    errors.push("Model is required.")
    return { ok: false, errors, warnings }
  }

  // `prompt` is required for every generation mode we currently ship.
  // We only enforce it when the caller passed the key explicitly so
  // flows that legitimately omit prompt (e.g. pure image-to-video
  // reframing) don't fail here — they don't pass the key at all.
  if (Object.prototype.hasOwnProperty.call(params, "prompt")) {
    const raw = params.prompt
    const trimmed = typeof raw === "string" ? raw.trim() : ""
    if (trimmed.length === 0) {
      errors.push("Prompt is required and cannot be empty.")
    }
  }

  const capability = MODEL_CAPABILITIES[modelId]
  if (!capability) {
    // Fix 5: unknown model — still enforce generic sanity checks so a
    // registry omission doesn't silently disable all validation.
    warnings.push(`Model "${modelId}" has no capability entry; applying baseline checks only.`)
    if (typeof params.n === "number") {
      if (!Number.isInteger(params.n) || params.n < 1) {
        errors.push(`n must be a positive integer (got ${params.n}).`)
      } else if (params.n > 8) {
        errors.push(`n=${params.n} exceeds the safety ceiling of 8 for unregistered models.`)
      }
    }
    if (params.duration !== undefined) {
      const d = toNumber(params.duration)
      if (d === null) {
        errors.push(`Duration "${String(params.duration)}" is not a valid number.`)
      } else if (d <= 0 || d > 60) {
        errors.push(`Duration ${d}s is outside the sane range (0, 60] for unregistered models.`)
      }
    }
    if (params.aspect_ratio && !/^\d+:\d+$/.test(params.aspect_ratio)) {
      errors.push(`Aspect ratio "${params.aspect_ratio}" is not in "W:H" format.`)
    }
    return { ok: errors.length === 0, errors, warnings }
  }

  if (capability.aspectRatios && params.aspect_ratio) {
    if (!capability.aspectRatios.includes(params.aspect_ratio)) {
      errors.push(
        `Aspect ratio "${params.aspect_ratio}" is not supported for ${modelId}. Allowed: ${capability.aspectRatios.join(", ")}.`,
      )
    }
  }

  if (capability.resolutions && params.resolution) {
    if (!capability.resolutions.includes(params.resolution)) {
      errors.push(
        `Resolution "${params.resolution}" is not supported for ${modelId}. Allowed: ${capability.resolutions.join(", ")}.`,
      )
    }
  }

  if (capability.durations && params.duration !== undefined) {
    const duration = toNumber(params.duration)
    if (duration === null) {
      errors.push(`Duration "${String(params.duration)}" is not a valid number.`)
    } else if (!capability.durations.includes(duration)) {
      errors.push(
        `Duration ${duration}s is not supported for ${modelId}. Allowed: ${capability.durations.join(", ")}.`,
      )
    }
  }

  if (typeof params.n === "number") {
    const n = params.n
    if (!Number.isInteger(n) || n < 1) {
      errors.push(`n must be a positive integer (got ${n}).`)
    } else {
      if (capability.nMin !== undefined && n < capability.nMin) {
        errors.push(`n=${n} is below the minimum (${capability.nMin}) for ${modelId}.`)
      }
      if (capability.nMax !== undefined && n > capability.nMax) {
        errors.push(`n=${n} exceeds the maximum (${capability.nMax}) for ${modelId}.`)
      }
    }
  }

  if (capability.requiresReferenceImage && !refs.hasReferenceImage) {
    errors.push(`${modelId} requires a reference image.`)
  }
  if (capability.forbidsReferenceImage && refs.hasReferenceImage) {
    errors.push(`${modelId} does not accept a reference image.`)
  }
  if (
    capability.maxReferenceImages !== undefined &&
    typeof refs.referenceImageCount === "number" &&
    refs.referenceImageCount > capability.maxReferenceImages
  ) {
    errors.push(
      `${modelId} accepts up to ${capability.maxReferenceImages} reference image${capability.maxReferenceImages === 1 ? "" : "s"} (got ${refs.referenceImageCount}).`,
    )
  }

  if (capability.supportsSeed === false && hasValue(params.seed)) {
    errors.push(`${modelId} does not accept a seed parameter.`)
  }

  if (capability.mutex) {
    for (const group of capability.mutex) {
      const active = group.filter((key) => hasValue((params as Record<string, unknown>)[key]))
      if (active.length > 1) {
        errors.push(`The following parameters are mutually exclusive for ${modelId}: ${active.join(", ")}.`)
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings, capability }
}

export function getModelCapability(modelId: string | undefined): ModelCapability | undefined {
  if (!modelId) return undefined
  return MODEL_CAPABILITIES[modelId]
}

export function modelIgnoresArOnRef(modelId: string | undefined): boolean {
  const cap = getModelCapability(modelId)
  return cap?.kind === "video" && cap?.ignoresArOnRef !== false
}
