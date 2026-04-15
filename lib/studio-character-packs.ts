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

export interface StudioCharacterPackRecord {
  id: string
  uid: string
  name: string
  notes?: string
  referenceImageUrl?: string
  referenceVideoUrl?: string
  thumbnailUrl?: string
  sourceType: "image" | "video"
  createdAt: number
  updatedAt: number
}

const LOCAL_PREFIX = "studio_character_packs"

function localKey(uid: string) {
  return `${LOCAL_PREFIX}:${uid}`
}

function readLocalCharacterPacks(uid: string): StudioCharacterPackRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(localKey(uid))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocalCharacterPacks(uid: string, items: StudioCharacterPackRecord[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(localKey(uid), JSON.stringify(items))
}

export async function listStudioCharacterPacks(uid: string) {
  if (!uid) return []

  try {
    const snapshot = await getDocs(query(collection(db, "studioCharacterPacks"), where("uid", "==", uid)))
    const items = snapshot.docs
      .map((entry) => entry.data() as StudioCharacterPackRecord)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

    writeLocalCharacterPacks(uid, items)
    return items
  } catch (error) {
    console.warn("Falling back to local character packs.", error)
    return readLocalCharacterPacks(uid)
  }
}

export async function saveStudioCharacterPack(
  uid: string,
  input: Omit<StudioCharacterPackRecord, "id" | "uid" | "createdAt" | "updatedAt"> & { id?: string }
) {
  const now = Date.now()
  const id = input.id || `char_${now}_${Math.random().toString(36).slice(2, 8)}`
  const existingLocal = readLocalCharacterPacks(uid)
  const existing = existingLocal.find((item) => item.id === id)
  const record: StudioCharacterPackRecord = {
    ...existing,
    ...input,
    id,
    uid,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }

  const nextLocal = [record, ...existingLocal.filter((item) => item.id !== id)].sort((a, b) => b.updatedAt - a.updatedAt)
  writeLocalCharacterPacks(uid, nextLocal)

  try {
    await setDoc(doc(db, "studioCharacterPacks", id), record)
  } catch (error) {
    console.warn("Saved character pack locally only.", error)
  }

  return record
}

export async function deleteStudioCharacterPack(uid: string, packId: string) {
  const nextLocal = readLocalCharacterPacks(uid).filter((item) => item.id !== packId)
  writeLocalCharacterPacks(uid, nextLocal)

  try {
    await deleteDoc(doc(db, "studioCharacterPacks", packId))
  } catch (error) {
    console.warn("Removed character pack locally only.", error)
  }
}
