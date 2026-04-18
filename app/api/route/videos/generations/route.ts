import { NextResponse } from "next/server"
import { routeVideoSubmit, inferHttpStatus, buildProviderErrorPayload } from "@/lib/provider-router"

export const runtime = "nodejs"

export async function POST(request: Request) {
  let model: string | undefined
  try {
    const payload = await request.json()
    model = typeof payload?.model === "string" ? payload.model : undefined
    const result = await routeVideoSubmit(payload)
    return NextResponse.json(result)
  } catch (error) {
    const payload = buildProviderErrorPayload(error, {
      model,
    })
    return NextResponse.json(payload, { status: inferHttpStatus(error) })
  }
}
