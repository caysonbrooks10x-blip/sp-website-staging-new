import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "studiox-web",
    timestamp: new Date().toISOString(),
  })
}
