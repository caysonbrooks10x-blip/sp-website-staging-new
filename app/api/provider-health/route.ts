import { NextResponse } from "next/server"
import { queryApiMartUserBalance } from "@/lib/apimart"

export const runtime = "nodejs"

export async function GET() {
  const checkedAt = Date.now()

  try {
    const startedAt = Date.now()
    const balance = await queryApiMartUserBalance()
    const latencyMs = Date.now() - startedAt

    return NextResponse.json({
      checkedAt,
      providers: {
        apimart: {
          provider: "apimart",
          status: latencyMs > 4500 ? "degraded" : "healthy",
          signal: "live",
          latencyMs,
          lastCheckedAt: checkedAt,
          remainingBalance: balance.remain_balance,
          message: balance.unlimited_quota
            ? "Live balance check succeeded. Unlimited quota account detected."
            : `Live balance check succeeded. Remaining balance: ${balance.remain_balance}.`,
        },
        poyo: {
          provider: "poyo",
          status: "unknown",
          signal: "live",
          lastCheckedAt: checkedAt,
          message: "Poyo health is inferred from recent Studio job outcomes in this session.",
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live provider health check failed"

    return NextResponse.json({
      checkedAt,
      providers: {
        apimart: {
          provider: "apimart",
          status: "down",
          signal: "live",
          lastCheckedAt: checkedAt,
          message,
        },
        poyo: {
          provider: "poyo",
          status: "unknown",
          signal: "live",
          lastCheckedAt: checkedAt,
          message: "Poyo health is inferred from recent Studio job outcomes in this session.",
        },
      },
    })
  }
}
