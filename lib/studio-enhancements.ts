/**
 * Studio prompt + payload enhancements.
 *
 * Two model families have first-class API parameters that the UI must
 * translate into provider-specific fields instead of appending as prose:
 *
 *   1. Wan 2.6 `template` — 12 real ApiMart template identifiers
 *      (FULL handoff §4.6). Must be sent as `template` in the ApiMart
 *      payload, NOT as prompt text.
 *   2. Hailuo 2.3 `camera_movement` — 15 Chinese `[token]` strings
 *      (FULL handoff §4.5). Must be prepended inline to the prompt as
 *      e.g. `[推进] a sweeping shot of…`. English labels are UI-only.
 *
 * Any other model that receives a `cameraMovement` or `effectPreset`
 * value falls back to the legacy "append to prompt" behavior so UI
 * controls still contribute something when the provider doesn't have
 * a native slot.
 */

// -------------------------------------------------------------------
// Legacy camera moves — general cinematic vocabulary surfaced on the
// left panel for every video model except hailuo-2.3 (which uses the
// Chinese token set below).
// -------------------------------------------------------------------

export const CINEMA_CAMERA_MOVES = [
  "none",
  "dolly in",
  "dolly out",
  "orbit left",
  "orbit right",
  "crane up",
  "crane down",
  "push through",
  "handheld drift",
] as const

// -------------------------------------------------------------------
// Wan 2.6 `template` values — 12 real ApiMart identifiers.
// Source: handoff §4.6. Send as `template` on ApiMart submit.
// -------------------------------------------------------------------

export const WAN26_TEMPLATES = [
  "squish",
  "rotation",
  "poke",
  "inflate",
  "dissolve",
  "melt",
  "icecream",
  "flying",
  "carousel",
  "singleheart",
  "dance1",
  "dance2",
] as const

export type Wan26Template = (typeof WAN26_TEMPLATES)[number]

// "none" is a UI convenience for the preset picker.
export const WAN_EFFECT_PRESETS = ["none", ...WAN26_TEMPLATES] as const

export function getWan26Template(value?: string): Wan26Template | null {
  if (!value || value === "none") return null
  const normalized = value.trim().toLowerCase()
  return (WAN26_TEMPLATES as readonly string[]).includes(normalized)
    ? (normalized as Wan26Template)
    : null
}

export function isWan26Model(modelId?: string): boolean {
  if (!modelId) return false
  return modelId.startsWith("wan2.6")
}

// -------------------------------------------------------------------
// Hailuo 2.3 camera_movement — 15 Chinese [token] strings.
// Source: handoff §4.5. English labels drive the UI; Chinese token is
// prepended to the prompt body when the user picks one.
// -------------------------------------------------------------------

export interface Hailuo23CameraCommand {
  english: string
  token: string // includes the [ ] delimiters exactly as Hailuo expects
}

export const HAILUO_23_CAMERA_COMMANDS: Hailuo23CameraCommand[] = [
  { english: "pan left", token: "[左移]" },
  { english: "pan right", token: "[右移]" },
  { english: "dolly in", token: "[推进]" },
  { english: "dolly out", token: "[拉远]" },
  { english: "boom up", token: "[上升]" },
  { english: "boom down", token: "[下降]" },
  { english: "rotate left", token: "[左摇]" },
  { english: "rotate right", token: "[右摇]" },
  { english: "orbit left", token: "[左环绕]" },
  { english: "orbit right", token: "[右环绕]" },
  { english: "zoom in", token: "[变焦推近]" },
  { english: "zoom out", token: "[变焦拉远]" },
  { english: "handheld shake", token: "[晃动]" },
  { english: "follow subject", token: "[跟随]" },
  { english: "static", token: "[固定]" },
]

export const HAILUO_23_CAMERA_LABELS = [
  "none",
  ...HAILUO_23_CAMERA_COMMANDS.map((c) => c.english),
] as const

export function getHailuo23CameraToken(english?: string): string | null {
  if (!english || english === "none") return null
  const normalized = english.trim().toLowerCase()
  const match = HAILUO_23_CAMERA_COMMANDS.find((c) => c.english === normalized)
  return match ? match.token : null
}

export function isHailuo23Model(modelId?: string): boolean {
  if (!modelId) return false
  return modelId === "hailuo-2.3" || modelId === "MiniMax-Hailuo-2.3-Fast"
}

// -------------------------------------------------------------------
// Audio direction — still prose-based, applies to any model that
// accepts audio prompting.
// -------------------------------------------------------------------

export const AUDIO_DIRECTION_PRESETS = [
  "none",
  "cinematic score",
  "ambient pulse",
  "fashion runway",
  "uplifting brand anthem",
  "minimal electronic",
  "dramatic trailer",
] as const

export interface StudioPromptEnhancementInput {
  prompt: string
  model?: string
  cameraMovement?: string
  effectPreset?: string
  audioDirection?: string
  characterLock?: boolean
  characterReferenceName?: string
  characterReferenceNotes?: string
}

/**
 * Returns the final prompt text to send to the provider. Model-aware:
 *   - Hailuo 2.3 camera prepends `[token] ` to the prompt inline.
 *   - Wan 2.6 effect preset is NOT appended as prose (caller must send
 *     `template` as a payload param instead).
 *   - All other enhancements fall back to the legacy prose block.
 */
export function applyStudioPromptEnhancements({
  prompt,
  model,
  cameraMovement,
  effectPreset,
  audioDirection,
  characterLock,
  characterReferenceName,
  characterReferenceNotes,
}: StudioPromptEnhancementInput) {
  const additions: string[] = []
  let promptBody = prompt

  // 1. Hailuo 2.3 — inline Chinese token, not prose.
  if (isHailuo23Model(model)) {
    const token = getHailuo23CameraToken(cameraMovement)
    if (token) {
      promptBody = `${token} ${prompt}`.trim()
    }
    // consume it — do NOT append as English prose too
  } else if (cameraMovement && cameraMovement !== "none") {
    additions.push(`camera movement: ${cameraMovement}`)
  }

  // 2. Wan 2.6 — caller sends template as a payload param. Do NOT
  //    append effectPreset to prose for this model family.
  if (isWan26Model(model)) {
    // consume silently; template goes in the payload via buildWan26PayloadExtras
  } else if (effectPreset && effectPreset !== "none") {
    additions.push(`cinematic effect motif: ${effectPreset}`)
  }

  if (audioDirection && audioDirection !== "none") {
    additions.push(`audio direction: ${audioDirection}`)
  }

  if (characterLock) {
    additions.push("preserve the subject identity, facial structure, silhouette, and wardrobe continuity across frames")
  }

  if (characterReferenceName) {
    additions.push(`apply the saved character reference pack "${characterReferenceName}" as the identity anchor`)
  }

  if (characterReferenceNotes) {
    additions.push(`character reference notes: ${characterReferenceNotes}`)
  }

  if (additions.length === 0) return promptBody
  return `${promptBody.trim()}\n\nCreative directives: ${additions.join("; ")}.`
}

/**
 * Returns payload extras that the caller should spread into the
 * provider submission for Wan 2.6 models. Currently returns a
 * `template` field when the user picked a valid preset.
 */
export function buildWan26PayloadExtras(
  model: string | undefined,
  effectPreset: string | undefined,
): Record<string, string> {
  if (!isWan26Model(model)) return {}
  const template = getWan26Template(effectPreset)
  return template ? { template } : {}
}
