import type { CommunityCampaignMeta } from "@/lib/types"

export interface ExportPackPreset {
  id: string
  label: string
  width: number
  height: number
  platform: string
}

export interface ExportPackSourceAsset {
  url: string
  creationId?: string
}

export interface ExportPackPayload {
  assetUrl: string
  assets?: ExportPackSourceAsset[]
  type: "image" | "video"
  prompt?: string
  title?: string
  model?: string
  aspect?: string
  creationId?: string
  generationPlatform?: string
  campaign?: CommunityCampaignMeta
  presetIds?: string[]
  autoDownload?: boolean
}

export const EXPORT_PACK_PRESETS: ExportPackPreset[] = [
  { id: "instagram-post", label: "Instagram Post", width: 1080, height: 1080, platform: "Instagram" },
  { id: "instagram-story", label: "Instagram Story", width: 1080, height: 1920, platform: "Instagram" },
  { id: "x-landscape", label: "X / Twitter Landscape", width: 1600, height: 900, platform: "X" },
  { id: "linkedin-post", label: "LinkedIn Post", width: 1200, height: 627, platform: "LinkedIn" },
  { id: "youtube-thumb", label: "YouTube Thumbnail", width: 1280, height: 720, platform: "YouTube" },
]

const PRESET_LOOKUP = new Map(EXPORT_PACK_PRESETS.map((preset) => [preset.id, preset]))

export function normalizeExportPresetIds(raw?: string | string[] | null): string[] {
  const values = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : []
  const ids = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && PRESET_LOOKUP.has(value))
  return Array.from(new Set(ids))
}

export function getRecommendedExportPresets(campaign?: CommunityCampaignMeta): ExportPackPreset[] {
  const platform = campaign?.platform?.toLowerCase() || ""
  const goal = campaign?.goal?.toLowerCase() || ""

  const ids =
    platform.includes("instagram")
      ? ["instagram-post", "instagram-story"]
      : platform.includes("youtube")
        ? ["youtube-thumb", "x-landscape"]
        : platform.includes("linkedin")
          ? ["linkedin-post", "x-landscape"]
          : platform.includes("x")
            ? ["x-landscape", "instagram-post"]
            : goal.includes("thumbnail")
              ? ["youtube-thumb", "x-landscape"]
              : goal.includes("community")
                ? ["instagram-post", "x-landscape"]
                : ["instagram-post", "linkedin-post"]

  return ids
    .map((id) => PRESET_LOOKUP.get(id))
    .filter((preset): preset is ExportPackPreset => Boolean(preset))
}

export function resolveExportPackPresets(input: {
  type: "image" | "video"
  campaign?: CommunityCampaignMeta
  presetIds?: string[] | string
}): ExportPackPreset[] {
  if (input.type === "video") return []

  const selectedPresetIds = normalizeExportPresetIds(input.presetIds || input.campaign?.presetIds || [])
  if (selectedPresetIds.length > 0) {
    return selectedPresetIds
      .map((id) => PRESET_LOOKUP.get(id))
      .filter((preset): preset is ExportPackPreset => Boolean(preset))
  }

  return EXPORT_PACK_PRESETS
}

export function buildExportPackHref(payload: ExportPackPayload): string {
  const params = new URLSearchParams()
  const assets =
    payload.assets && payload.assets.length > 0
      ? payload.assets.filter((asset) => asset.url.trim().length > 0)
      : [{ url: payload.assetUrl, creationId: payload.creationId }]

  for (const asset of assets) {
    params.append("assetUrl", asset.url)
    if (asset.creationId) params.append("assetCreationId", asset.creationId)
  }

  if (!params.get("assetUrl")) return "/export-pack"
  params.set("type", payload.type)

  if (payload.prompt) params.set("prompt", payload.prompt)
  if (payload.title) params.set("title", payload.title)
  if (payload.model) params.set("model", payload.model)
  if (payload.aspect) params.set("aspect", payload.aspect)
  if (payload.creationId) params.set("creationId", payload.creationId)
  if (payload.generationPlatform) params.set("generationPlatform", payload.generationPlatform)
  if (payload.campaign?.goal) params.set("campaignGoal", payload.campaign.goal)
  if (payload.campaign?.platform) params.set("campaignPlatform", payload.campaign.platform)
  if (payload.campaign?.style) params.set("campaignStyle", payload.campaign.style)
  if (payload.campaign?.variationCount) params.set("campaignVariationCount", String(payload.campaign.variationCount))
  if (payload.campaign?.brief) params.set("campaignBrief", payload.campaign.brief)
  const presetIds = normalizeExportPresetIds(payload.presetIds || payload.campaign?.presetIds || [])
  if (presetIds.length > 0) params.set("campaignPresetIds", presetIds.join(","))
  if (payload.campaign?.directed) params.set("campaignDirected", "1")
  if (payload.autoDownload) params.set("autoDownload", "1")

  return `/export-pack?${params.toString()}`
}

export function buildExportPackFilename(title: string | undefined, creationId: string | undefined): string {
  const base = (title || "studiox-campaign-pack")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)

  const suffix = creationId ? `-${creationId.slice(0, 8)}` : ""
  return `${base || "studiox-campaign-pack"}${suffix}`
}
