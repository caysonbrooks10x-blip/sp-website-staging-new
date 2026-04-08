import { NextResponse } from "next/server"
import { queryApiMartTokenBalance, queryApiMartUserBalance } from "@/lib/apimart"

export const runtime = "edge"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get("scope")
    const result = scope === "user" ? await queryApiMartUserBalance() : await queryApiMartTokenBalance()
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "ApiMart balance query failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
