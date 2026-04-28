import { NextResponse } from "next/server"
import { routeTaskStatus, inferHttpStatus, buildProviderErrorPayload } from "@/lib/provider-router"
import type { StudioProvider } from "@/lib/provider-routing"
import { getAdminAuth } from "@/lib/firebase-admin"

export const runtime = "nodejs"

function classify(url: string): "video" | "image" {
  return /\.mp4(?:\?|$)/i.test(url) ? "video" : "image"
}

async function fireAndForgetRehost(args: {
  uid: string
  taskId: string
  provider: StudioProvider
  urls: string[]
}) {
  const remuxBase = process.env.VIDEO_REMUX_URL
  const remuxSecret = process.env.VIDEO_REMUX_SECRET
  if (!remuxBase || !remuxSecret) return

  await Promise.all(
    args.urls.map(async (url, index) => {
      try {
        const kind = classify(url)
        const path = kind === "video" ? "/internal/video/faststart" : "/internal/image/rehost"
        const body =
          kind === "video"
            ? { url, taskId: args.taskId, userId: args.uid, provider: args.provider }
            : { url, taskId: args.taskId, userId: args.uid, index }
        const ctl = new AbortController()
        const timer = setTimeout(() => ctl.abort(), 90_000)
        const resp = await fetch(`${remuxBase}${path}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-internal-secret": remuxSecret,
          },
          body: JSON.stringify(body),
          signal: ctl.signal,
          cache: "no-store",
        }).finally(() => clearTimeout(timer))
        if (!resp.ok) {
          console.warn(
            `[task-finalize] rehost ${kind} status=${resp.status} task=${args.taskId}`,
          )
        }
      } catch (err) {
        console.warn(`[task-finalize] rehost exception task=${args.taskId}:`, err)
      }
    }),
  )
}

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  try {
    const { searchParams } = new URL(request.url)
    const { taskId } = await context.params
    const providerParam = searchParams.get("provider") || "apimart"
    if (providerParam !== "apimart" && providerParam !== "poyo") {
      return NextResponse.json(
        { error: "provider query param must be 'apimart' or 'poyo'" },
        { status: 400 },
      )
    }
    const language = searchParams.get("language") || "en"
    const result = await routeTaskStatus(providerParam as StudioProvider, taskId, language)

    if (result.status === "completed" && result.output_urls.length > 0) {
      const authHeader = request.headers.get("Authorization") || ""
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
      if (token) {
        try {
          const decoded = await getAdminAuth().verifyIdToken(token)
          // Fire-and-forget: don't block the poll response. Client will call
          // its own finalize in parallel; rehost endpoints are idempotent
          // (existence check short-circuits) so doubled calls are harmless.
          void fireAndForgetRehost({
            uid: decoded.uid,
            taskId,
            provider: providerParam as StudioProvider,
            urls: result.output_urls,
          })
        } catch {
          // Bad token — skip rehost; client-side finalize still runs.
        }
      }
    }

    const { raw: _raw, ...publicResult } = result
    return NextResponse.json(publicResult)
  } catch (error) {
    const payload = buildProviderErrorPayload(error, {})
    return NextResponse.json(payload, { status: inferHttpStatus(error) })
  }
}
