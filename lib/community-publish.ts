"use client"

import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import { db, functions } from "@/lib/firebaseClient"
import type { CommunityCampaignMeta, CommunityPost } from "@/lib/types"

type CommunityAspectRatio = CommunityPost["aspectRatio"]

export interface CommunityPublishInput {
  title: string
  prompt: string
  caption?: string
  model?: string
  type: "image" | "video"
  creationId?: string | null
  author: {
    name: string
    avatar: string
    uid: string
  }
  tags: string[]
  assetUrl: string
  thumbnailUrl: string
  allowRemix: boolean
  isPublic?: boolean
  parentCreationId?: string
  rootCreationId?: string
  remixDepth?: number
  sourcePostId?: string
  campaign?: CommunityCampaignMeta
  generationPlatform?: string
  taskId?: string
  aspectRatio?: CommunityAspectRatio
  templatePack?: string
  templateShareUrl?: string
  workflowMode?: "image" | "video" | "remix"
  extraTags?: string[]
}

function deriveAspectRatio(
  type: "image" | "video",
  creationId?: string | null,
  aspectRatio?: CommunityAspectRatio
): CommunityAspectRatio {
  if (aspectRatio) return aspectRatio
  if (type === "video") return "landscape"
  if (creationId?.includes("1:1")) return "square"
  if (creationId?.includes("9:16") || creationId?.includes("3:4") || creationId?.includes("4:5")) return "portrait"
  if (creationId?.includes("16:9") || creationId?.includes("4:3") || creationId?.includes("3:2")) return "landscape"
  return "square"
}

function buildPayload(input: CommunityPublishInput) {
  return {
    title: input.title || "StudioX Upload",
    prompt: input.prompt || "No description provided.",
    caption: input.caption || "",
    description: input.caption || input.prompt || "",
    model: input.model || "StudioX",
    type: input.type,
    creationId: input.creationId || null,
    author: input.author,
    tags: input.tags,
    assetUrl: input.assetUrl,
    thumbnailUrl: input.thumbnailUrl,
    allowRemix: input.allowRemix,
    isPublic: input.isPublic ?? true,
    aspectRatio: deriveAspectRatio(input.type, input.creationId, input.aspectRatio),
    likes: 0,
    views: 0,
    status: "published",
    source: "studiox-web",
    parentCreationId: input.parentCreationId || null,
    rootCreationId: input.rootCreationId || input.parentCreationId || input.creationId || null,
    remixDepth: input.remixDepth || 0,
    sourcePostId: input.sourcePostId || null,
    campaign: input.campaign || null,
    generationPlatform: input.generationPlatform || "poyo",
    taskId: input.taskId || input.creationId || null,
    templatePack: input.templatePack || null,
    templateShareUrl: input.templateShareUrl || null,
    workflowMode: input.workflowMode || null,
  }
}

export async function publishCommunityPost(input: CommunityPublishInput): Promise<{ postId?: string }> {
  const payload = buildPayload(input)

  try {
    const docRef = await addDoc(collection(db, "posts"), {
      ...payload,
      createdAt: serverTimestamp(),
    })
    return { postId: docRef.id }
  } catch (firestoreError) {
    console.warn("Direct Firestore community publish failed, falling back to callable.", firestoreError)
    const publishPost = httpsCallable(functions, "publishPost")
    const result = await publishPost(payload)
    const data = result.data as { postId?: string } | undefined
    return { postId: data?.postId }
  }
}
