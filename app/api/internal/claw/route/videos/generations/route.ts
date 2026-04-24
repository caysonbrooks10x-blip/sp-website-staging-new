import { NextResponse } from "next/server"
import { routeVideoSubmit, inferHttpStatus, buildProviderErrorPayload } from "@/lib/provider-router"
import {
  chargeUidForSubmit,
  refundCredits,
  buildConfigFromPayload,
  InsufficientTokensError,
  CreditsAuthError,
  CreditsConfigError,
} from "@/lib/credits-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CLAW_BOT_SECRET = process.env.CLAW_BOT_SECRET?.trim() || ""

function isAuthorized(request: Request): boolean {
  const secret = request.headers.get("X-Claw-Secret")?.trim()
  return Boolean(CLAW_BOT_SECRET && secret && secret === CLAW_BOT_SECRET)
}

export async function POST(request: Request) {
  let charged: { uid: string; charged: number } | null = null
  let model: string | undefined
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const firebaseUID = typeof body?.firebaseUID === "string" ? body.firebaseUID : ""
    model = typeof body?.model === "string" ? body.model : undefined
    if (!firebaseUID || !model) {
      return NextResponse.json({ error: "firebaseUID and model are required" }, { status: 400 })
    }

    const payload = { ...body }
    delete payload.firebaseUID

    const result = await chargeUidForSubmit({
      uid: firebaseUID,
      model,
      config: buildConfigFromPayload(payload),
    })
    charged = { uid: result.uid, charged: result.charged }

    try {
      const submission = await routeVideoSubmit(payload)
      return NextResponse.json({
        ...submission,
        credits_used: result.charged,
        balance_remaining: result.newBalance,
      })
    } catch (submitErr) {
      if (charged && charged.charged > 0) {
        await refundCredits(charged.uid, charged.charged)
        charged = null
      }
      throw submitErr
    }
  } catch (error) {
    if (error instanceof InsufficientTokensError) {
      return NextResponse.json(
        { error: error.message, details: { code: error.code, required: error.required, balance: error.balance } },
        { status: 402 },
      )
    }
    if (error instanceof CreditsAuthError) {
      return NextResponse.json({ error: error.message, details: { code: error.code } }, { status: 401 })
    }
    if (error instanceof CreditsConfigError) {
      return NextResponse.json({ error: error.message, details: { code: error.code } }, { status: 500 })
    }
    const payload = buildProviderErrorPayload(error, { model })
    return NextResponse.json(payload, { status: inferHttpStatus(error) })
  }
}
