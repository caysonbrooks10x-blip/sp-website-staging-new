"use client"

import { auth } from "@/lib/firebaseClient"
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

async function getIdToken(): Promise<string | null> {
  const currentUser = auth.currentUser
  if (!currentUser) return null
  try {
    return await currentUser.getIdToken()
  } catch {
    return null
  }
}

export async function persistStudioGeneration(uid: string, input: PersistedStudioGeneration) {
  void uid

  // Optimistic local cache so the current tab sees the new creation immediately.
  const current = readLocalStudioGenerationHistory()
  const next = [input, ...current.filter((item) => item.id !== input.id)].slice(0, 40)
  writeLocalStudioGenerationHistory(next)

  const token = await getIdToken()
  if (!token) return

  try {
    await fetch("/api/creations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    })
  } catch (error) {
    console.warn("Failed to persist studio generation remotely:", error)
  }
}

export async function listPersistedStudioGenerations(uid: string): Promise<PersistedStudioGeneration[]> {
  void uid

  const local = readLocalStudioGenerationHistory()
  const token = await getIdToken()
  if (!token) return local

  try {
    const res = await fetch("/api/creations", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) return local

    const payload = (await res.json()) as { creations?: unknown }
    const remoteList = Array.isArray(payload.creations) ? payload.creations : []

    const merged = new Map<string, PersistedStudioGeneration>()
    for (const item of remoteList) {
      if (!item || typeof item !== "object") continue
      const record = item as PersistedStudioGeneration & { id?: string }
      if (!record.id || !record.outputUrl) continue
      merged.set(String(record.id), {
        id: String(record.id),
        creationId: record.creationId || String(record.id),
        taskId: record.taskId || null,
        prompt: record.prompt || "Untitled Creation",
        model: record.model,
        type: record.type === "video" ? "video" : "image",
        outputUrl: record.outputUrl,
        outputUrls: record.outputUrls,
        thumbnailUrl: record.thumbnailUrl || null,
        generationPlatform: record.generationPlatform,
        rootCreationId: record.rootCreationId || null,
        parentCreationId: record.parentCreationId || null,
        remixDepth: Number(record.remixDepth || 0),
        sourcePostId: record.sourcePostId || null,
        campaign: record.campaign || null,
      })
    }

    // Fold in localStorage entries that haven't synced yet (unseen by server).
    for (const item of local) {
      if (!merged.has(item.id)) merged.set(item.id, item)
    }

    return Array.from(merged.values())
  } catch (error) {
    console.warn("Remote creations fetch failed, falling back to local history.", error)
    return local
  }
}

export async function deletePersistedStudioGeneration(uid: string, generationId: string) {
  void uid

  const current = readLocalStudioGenerationHistory()
  writeLocalStudioGenerationHistory(current.filter((item) => item.id !== generationId))

  const token = await getIdToken()
  if (!token) return

  try {
    await fetch(`/api/creations?id=${encodeURIComponent(generationId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch (error) {
    console.warn("Failed to delete remote creation:", error)
  }
}
