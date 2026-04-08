import { NextResponse } from "next/server"
import { ApiMartRequestError, submitApiMartVideoGeneration } from "@/lib/apimart"

export const runtime = "edge"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const result = await submitApiMartVideoGeneration(payload)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "ApiMart video generation failed"
    const status = error instanceof ApiMartRequestError && error.status ? error.status : 500
    return NextResponse.json({ error: message }, { status })
  }
}
