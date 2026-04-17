import { NextResponse } from "next/server"
import { routeVideoSubmit, inferHttpStatus } from "@/lib/provider-router"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const result = await routeVideoSubmit(payload)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video generation failed"
    return NextResponse.json({ error: message }, { status: inferHttpStatus(error) })
  }
}
