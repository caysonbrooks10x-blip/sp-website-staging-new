import { NextResponse } from "next/server"
import { routeRemixSubmit, inferHttpStatus } from "@/lib/provider-router"

export const runtime = "nodejs"

export async function POST(request: Request, context: { params: Promise<{ videoId: string }> }) {
  try {
    const payload = await request.json()
    const { videoId } = await context.params
    const result = await routeRemixSubmit(videoId, payload)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video remix failed"
    return NextResponse.json({ error: message }, { status: inferHttpStatus(error) })
  }
}
