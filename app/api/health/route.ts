import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "studiox-web",
    providers: {
      apimart: Boolean(process.env.APIMART_API_KEY?.trim()),
      poyo: Boolean(process.env.POYO_API_KEY?.trim()),
    },
    timestamp: new Date().toISOString(),
  })
}
