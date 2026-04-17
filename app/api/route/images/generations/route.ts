import { NextResponse } from "next/server"
import { routeImageSubmit, inferHttpStatus } from "@/lib/provider-router"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const result = await routeImageSubmit(payload)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed"
    return NextResponse.json({ error: message }, { status: inferHttpStatus(error) })
  }
}
