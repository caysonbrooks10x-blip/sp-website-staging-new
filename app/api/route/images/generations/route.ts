import { NextResponse } from "next/server"
import { routeImageSubmit, inferHttpStatus, buildProviderErrorPayload } from "@/lib/provider-router"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const result = await routeImageSubmit(payload)
    return NextResponse.json(result)
  } catch (error) {
    const payload = buildProviderErrorPayload(error, {})
    return NextResponse.json(payload, { status: inferHttpStatus(error) })
  }
}
