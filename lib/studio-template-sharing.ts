export interface StudioTemplateSharePayload {
  version: 1
  name?: string
  description?: string
  mode: "image" | "video" | "remix"
  model: string
  provider?: string
  prompt: string
  aspectRatio?: string
  resolution?: string
  duration?: number
  imageCount?: number
  remixStrength?: number
  outputFormat?: string
  videoStyle?: string
  videoMode?: string
  negativePrompt?: string
  storyboard?: boolean
  soundEnabled?: boolean
  generateAudio?: boolean
  characterOrientation?: string
  directorGoal?: string
  directorPlatform?: string
  directorStyle?: string
  directorBrief?: string
  directorVariations?: number
  directorPresetIds?: string[]
  autoExportPack?: boolean
  cameraMovement?: string
  effectPreset?: string
  audioDirection?: string
  characterLock?: boolean
  characterPackId?: string
  characterPackName?: string
  characterPackNotes?: string
  sharedFrom?: "saved-template" | "workflow-template" | "generation"
}

type TemplateLike = {
  mode?: "image" | "video" | "remix"
  model?: string
  prompt?: string
  provider?: string
  name?: string
  description?: string
  aspectRatio?: string
  resolution?: string
  duration?: number
  imageCount?: number
  remixStrength?: number
  outputFormat?: string
  videoStyle?: string
  videoMode?: string
  negativePrompt?: string
  storyboard?: boolean
  soundEnabled?: boolean
  generateAudio?: boolean
  characterOrientation?: string
  directorGoal?: string
  directorPlatform?: string
  directorStyle?: string
  directorBrief?: string
  directorVariations?: number
  directorPresetIds?: string[]
  autoExportPack?: boolean
  cameraMovement?: string
  effectPreset?: string
  audioDirection?: string
  characterLock?: boolean
  characterPackId?: string
  characterPackName?: string
  characterPackNotes?: string
  sharedFrom?: StudioTemplateSharePayload["sharedFrom"]
}

function toBase64Url(value: string) {
  if (typeof window !== "undefined") {
    return window.btoa(unescape(encodeURIComponent(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
  }

  return Buffer.from(value, "utf8").toString("base64url")
}

function fromBase64Url(value: string) {
  if (typeof window !== "undefined") {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=")
    return decodeURIComponent(escape(window.atob(padded)))
  }

  return Buffer.from(value, "base64url").toString("utf8")
}

function compactPayload(payload: StudioTemplateSharePayload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (value === undefined || value === null) return false
      if (typeof value === "string") return value.trim().length > 0
      if (Array.isArray(value)) return value.length > 0
      return true
    })
  ) as StudioTemplateSharePayload
}

export function buildStudioTemplateSharePayload(template: TemplateLike): StudioTemplateSharePayload {
  if (!template.model || !template.prompt || !template.mode) {
    throw new Error("Template sharing needs a mode, model, and prompt.")
  }

  return compactPayload({
    version: 1,
    name: template.name,
    description: template.description,
    mode: template.mode,
    model: template.model,
    provider: template.provider,
    prompt: template.prompt,
    aspectRatio: template.aspectRatio,
    resolution: template.resolution,
    duration: template.duration,
    imageCount: template.imageCount,
    remixStrength: template.remixStrength,
    outputFormat: template.outputFormat,
    videoStyle: template.videoStyle,
    videoMode: template.videoMode,
    negativePrompt: template.negativePrompt,
    storyboard: template.storyboard,
    soundEnabled: template.soundEnabled,
    generateAudio: template.generateAudio,
    characterOrientation: template.characterOrientation,
    directorGoal: template.directorGoal,
    directorPlatform: template.directorPlatform,
    directorStyle: template.directorStyle,
    directorBrief: template.directorBrief,
    directorVariations: template.directorVariations,
    directorPresetIds: template.directorPresetIds,
    autoExportPack: template.autoExportPack,
    cameraMovement: template.cameraMovement,
    effectPreset: template.effectPreset,
    audioDirection: template.audioDirection,
    characterLock: template.characterLock,
    characterPackId: template.characterPackId,
    characterPackName: template.characterPackName,
    characterPackNotes: template.characterPackNotes,
    sharedFrom: template.sharedFrom,
  })
}

export function encodeStudioTemplatePack(template: TemplateLike) {
  const payload = buildStudioTemplateSharePayload(template)
  return toBase64Url(JSON.stringify(payload))
}

export function decodeStudioTemplatePack(pack: string): StudioTemplateSharePayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(pack)) as StudioTemplateSharePayload
    if (parsed?.version !== 1 || !parsed.mode || !parsed.model || !parsed.prompt) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function buildStudioTemplateSharePath(template: TemplateLike) {
  const pack = encodeStudioTemplatePack(template)
  const params = new URLSearchParams({
    templatePack: pack,
    mode: template.mode || "image",
  })
  return `/studio?${params.toString()}`
}

export function buildStudioTemplateShareUrl(template: TemplateLike, origin?: string) {
  const path = buildStudioTemplateSharePath(template)
  if (!origin) return path
  return `${origin.replace(/\/$/, "")}${path}`
}
