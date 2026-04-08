"use client"

import type { CommunityCampaignMeta } from "@/lib/types"

export interface PersistedStudioGeneration {
  id: string
  creationId: string
  taskId?: string | null
  prompt: string
  model?: string
  type: "image" | "video"
  outputUrl: string
  outputUrls?: string[]
  thumbnailUrl?: string | null
  generationPlatform?: string
  rootCreationId?: string | null
  parentCreationId?: string | null
  remixDepth?: number
  sourcePostId?: string | null
  campaign?: CommunityCampaignMeta | null
}

function readLocalStudioGenerationHistory(): PersistedStudioGeneration[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem("studio_generations_history")
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const mapped: PersistedStudioGeneration[] = []

    for (const item of parsed) {
      const outputUrl = typeof item?.src === "string" ? item.src : ""
      if (!outputUrl) continue

      mapped.push({
        id: String(item.id || item.creationId || item.taskId || outputUrl),
        creationId: String(item.creationId || item.taskId || item.id || outputUrl),
        taskId: item.taskId || null,
        prompt: item.prompt || "Untitled Creation",
        model: item.model,
        type: item.type === "video" ? "video" : "image",
        outputUrl,
        outputUrls: Array.isArray(item.srcs) ? item.srcs : undefined,
        thumbnailUrl: item.thumbnailUrl || null,
        generationPlatform: item.generationPlatform || item.settings?.provider,
        rootCreationId: item.settings?.rootCreationId || item.settings?.originalCreationId || null,
        parentCreationId: item.settings?.parentCreationId || null,
        remixDepth: Number(item.settings?.remixDepth || 0),
        sourcePostId: item.settings?.sourcePostId || null,
        campaign: item.settings?.campaign || null,
      })
    }

    return mapped
  } catch (error) {
    console.warn("Failed to read local studio generation history.", error)
    return []
  }
}

function writeLocalStudioGenerationHistory(items: PersistedStudioGeneration[]) {
  if (typeof window === "undefined") return

  const serialized = items.map((item) => ({
    id: item.id,
    creationId: item.creationId,
    taskId: item.taskId || null,
    prompt: item.prompt,
    model: item.model,
    type: item.type,
    src: item.outputUrl,
    srcs: item.outputUrls,
    thumbnailUrl: item.thumbnailUrl || null,
    generationPlatform: item.generationPlatform,
    settings: {
      rootCreationId: item.rootCreationId || null,
      parentCreationId: item.parentCreationId || null,
      remixDepth: item.remixDepth || 0,
      sourcePostId: item.sourcePostId || null,
      campaign: item.campaign || null,
    },
  }))

  window.localStorage.setItem("studio_generations_history", JSON.stringify(serialized))
}

export async function persistStudioGeneration(uid: string, input: PersistedStudioGeneration) {
  void uid

  const current = readLocalStudioGenerationHistory()
  const next = [input, ...current.filter((item) => item.id !== input.id)].slice(0, 40)
  writeLocalStudioGenerationHistory(next)
}

export async function listPersistedStudioGenerations(uid: string) {
  void uid
  return readLocalStudioGenerationHistory()
}

export async function deletePersistedStudioGeneration(uid: string, generationId: string) {
  void uid

  const current = readLocalStudioGenerationHistory()
  writeLocalStudioGenerationHistory(current.filter((item) => item.id !== generationId))
}
