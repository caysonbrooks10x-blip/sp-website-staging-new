import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface CreationDoc {
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
  campaign?: unknown
}

async function authenticate(request: Request): Promise<string | NextResponse> {
  const header = request.headers.get("Authorization") || ""
  if (!header.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(header.slice(7))
    return decoded.uid
  } catch {
    return NextResponse.json({ error: "Invalid auth token" }, { status: 401 })
  }
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

export async function GET(request: Request) {
  const auth = await authenticate(request)
  if (typeof auth !== "string") return auth
  const uid = auth

  try {
    const snap = await getAdminDb()
      .collection("users").doc(uid)
      .collection("creations")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get()

    const creations = snap.docs.map((doc) => {
      const data = doc.data()
      const createdAt = data.createdAt
      const createdAtMs =
        createdAt && typeof createdAt.toMillis === "function" ? createdAt.toMillis() : null
      return { ...data, id: doc.id, createdAtMs }
    })

    return NextResponse.json({ creations })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list creations"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await authenticate(request)
  if (typeof auth !== "string") return auth
  const uid = auth

  let body: Partial<CreationDoc>
  try {
    body = (await request.json()) as Partial<CreationDoc>
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.id || !body.outputUrl || !body.type) {
    return NextResponse.json(
      { error: "id, outputUrl, and type are required" },
      { status: 400 },
    )
  }

  const id = String(body.id)
  const doc = stripUndefined({
    id,
    creationId: body.creationId || id,
    taskId: body.taskId ?? null,
    prompt: body.prompt || "Untitled Creation",
    model: body.model,
    type: body.type === "video" ? "video" : "image",
    outputUrl: body.outputUrl,
    outputUrls: Array.isArray(body.outputUrls) ? body.outputUrls : undefined,
    thumbnailUrl: body.thumbnailUrl ?? null,
    generationPlatform: body.generationPlatform,
    rootCreationId: body.rootCreationId ?? null,
    parentCreationId: body.parentCreationId ?? null,
    remixDepth: typeof body.remixDepth === "number" ? body.remixDepth : 0,
    sourcePostId: body.sourcePostId ?? null,
    campaign: body.campaign ?? null,
  })

  try {
    await getAdminDb()
      .collection("users").doc(uid)
      .collection("creations").doc(id)
      .set({ ...doc, createdAt: FieldValue.serverTimestamp() }, { merge: true })

    return NextResponse.json({ ok: true, id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to persist creation"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await authenticate(request)
  if (typeof auth !== "string") return auth
  const uid = auth

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "id query param required" }, { status: 400 })
  }

  try {
    await getAdminDb()
      .collection("users").doc(uid)
      .collection("creations").doc(id)
      .delete()
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete creation"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
