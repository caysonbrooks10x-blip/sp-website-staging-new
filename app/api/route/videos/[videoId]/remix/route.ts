import { NextResponse } from "next/server"
import { routeRemixSubmit, inferHttpStatus, buildProviderErrorPayload } from "@/lib/provider-router"

export const runtime = "nodejs"

export async function POST(request: Request, context: { params: Promise<{ videoId: string }> }) {
  let model: string | undefined
  try {
    const payload = await request.json()
    model = typeof payload?.model === "string" ? payload.model : undefined
    const { videoId } = await context.params
    const result = await routeRemixSubmit(videoId, payload)
    return NextResponse.json(result)
  } catch (error) {
    const payload = buildProviderErrorPayload(error, {
      model,
    })
    return NextResponse.json(payload, { status: inferHttpStatus(error) })
  }
}
