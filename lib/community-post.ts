import type { CommunityCampaignMeta, CommunityPost } from "@/lib/types"

function asDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate()
  }
  return new Date()
}

export function mapCommunityPost(id: string, data: Record<string, any>): CommunityPost {
  return {
    id,
    type: data.type || "image",
    title: data.title || "Untitled",
    description: data.description || data.caption || "",
    prompt: data.prompt || "",
    author: {
      id: data.author?.uid || data.author?.id || "unknown",
      name: data.author?.name || "Anonymous",
      avatar: data.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
    },
    assetUrl:
      data.assetUrl ||
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2560&auto=format&fit=crop",
    thumbnailUrl:
      data.thumbnailUrl ||
      data.assetUrl ||
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2560&auto=format&fit=crop",
    aspectRatio: data.aspectRatio || (data.type === "video" ? "landscape" : "portrait"),
    likes: data.likes || 0,
    views: data.views || 0,
    allowRemix: data.allowRemix ?? true,
    createdAt: asDate(data.createdAt),
    creationId: data.creationId || data.parameters?.originalCreationId,
    tags: data.tags || [],
    model: data.model || "Unknown",
    preset: data.preset || "General",
    quality: data.quality || "Standard",
    size: data.size || "1024x1024",
    parentCreationId: data.parentCreationId || data.remixSourceId || data.parentAssetId,
    rootCreationId: data.rootCreationId,
    remixDepth: typeof data.remixDepth === "number" ? data.remixDepth : 0,
    sourcePostId: data.sourcePostId,
    campaign: (data.campaign || undefined) as CommunityCampaignMeta | undefined,
    generationPlatform: data.generationPlatform || data.platform || data.provider,
    taskId: data.taskId || data.creationId || undefined,
  }
}
