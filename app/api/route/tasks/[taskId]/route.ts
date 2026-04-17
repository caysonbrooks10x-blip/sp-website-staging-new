import { NextResponse } from "next/server"
import { routeTaskStatus, inferHttpStatus } from "@/lib/provider-router"
import type { StudioProvider } from "@/lib/provider-routing"

export const runtime = "nodejs"

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
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Task status query failed"
    return NextResponse.json({ error: message }, { status: inferHttpStatus(error) })
  }
}
