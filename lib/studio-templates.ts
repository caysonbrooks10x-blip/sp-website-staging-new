"use client"

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore"
import { db } from "@/lib/firebaseClient"

export type SavedStudioTemplateMode = "image" | "video" | "remix"

export interface StudioTemplateRecord {
  id: string
  uid: string
  name: string
  description?: string
  mode: SavedStudioTemplateMode
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
  directorModeEnabled?: boolean
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
  source: "saved" | "workflow"
  createdAt: number
  updatedAt: number
}

const LOCAL_PREFIX = "studio_saved_templates"

function localKey(uid: string) {
  return `${LOCAL_PREFIX}:${uid}`
}

function readLocalTemplates(uid: string): StudioTemplateRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(localKey(uid))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function writeLocalTemplates(uid: string, templates: StudioTemplateRecord[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(localKey(uid), JSON.stringify(templates))
}

export async function listStudioTemplates(uid: string) {
  if (!uid) return []

  try {
    const snapshot = await getDocs(query(collection(db, "studioTemplates"), where("uid", "==", uid)))
    const items = snapshot.docs
      .map((entry) => entry.data() as StudioTemplateRecord)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

    writeLocalTemplates(uid, items)
    return items
  } catch (error) {
    console.warn("Falling back to local Studio templates.", error)
    return readLocalTemplates(uid)
  }
}

export async function saveStudioTemplate(
  uid: string,
  input: Omit<StudioTemplateRecord, "id" | "uid" | "createdAt" | "updatedAt"> & { id?: string }
) {
  const now = Date.now()
  const id = input.id || `tpl_${now}_${Math.random().toString(36).slice(2, 8)}`
  const existingLocal = readLocalTemplates(uid)
  const existing = existingLocal.find((item) => item.id === id)
  const record: StudioTemplateRecord = {
    ...existing,
    ...input,
    id,
    uid,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }

  const nextLocal = [record, ...existingLocal.filter((item) => item.id !== id)].sort((a, b) => b.updatedAt - a.updatedAt)
  writeLocalTemplates(uid, nextLocal)

  try {
    await setDoc(doc(db, "studioTemplates", id), record)
  } catch (error) {
    console.warn("Saved Studio template locally only.", error)
  }

  return record
}

export async function deleteStudioTemplate(uid: string, templateId: string) {
  const nextLocal = readLocalTemplates(uid).filter((item) => item.id !== templateId)
  writeLocalTemplates(uid, nextLocal)

  try {
    await deleteDoc(doc(db, "studioTemplates", templateId))
  } catch (error) {
    console.warn("Removed Studio template locally only.", error)
  }
}
