import { NextResponse } from "next/server"
import { routeImageSubmit, inferHttpStatus, buildProviderErrorPayload } from "@/lib/provider-router"
import {
  chargeUserForSubmit,
  refundCredits,
  buildConfigFromPayload,
  InsufficientTokensError,
  CreditsAuthError,
  CreditsConfigError,
} from "@/lib/credits-server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  let charged: { uid: string; charged: number } | null = null
  let model: string | undefined
  try {
    const payload = await request.json()
    model = typeof payload?.model === "string" ? payload.model : undefined
    if (!model) {
      return NextResponse.json({ error: "model is required" }, { status: 400 })
    }
    const result = await chargeUserForSubmit({
      authHeader: request.headers.get("Authorization"),
      model,
      config: buildConfigFromPayload(payload),
    })
    charged = { uid: result.uid, charged: result.charged }
    try {
      const submission = await routeImageSubmit(payload)
      return NextResponse.json(submission)
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
    const payload = buildProviderErrorPayload(error, {})
    return NextResponse.json(payload, { status: inferHttpStatus(error) })
  }
}
