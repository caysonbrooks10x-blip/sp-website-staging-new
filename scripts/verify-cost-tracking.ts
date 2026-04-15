/**
 * Offline smoke test for lib/cost-tracking.ts.
 *
 * Run: npx tsx scripts/verify-cost-tracking.ts
 */

import {
  computeCost,
  recordGenerationCost,
  setCostSink,
  type CostRecord,
} from "../lib/cost-tracking"
import { setSink as setLogSink } from "../lib/logger"

let passed = 0
let failed = 0

function check(name: string, cond: boolean, details?: unknown) {
  if (cond) {
    passed += 1
    return
  }
  failed += 1
  console.error(`  ✘ ${name}`, details ?? "")
}

// Silence logger events from this test.
setLogSink(() => undefined)

// -- computeCost --------------------------------------------------------

check(
  "computeCost: uses getCost when defined",
  computeCost({ id: "x", baseCost: 0.01, getCost: () => 0.05 }) === 0.05,
)
check(
  "computeCost: passes params through to getCost",
  computeCost(
    {
      id: "x",
      baseCost: 0.01,
      getCost: (p) => ((p.n as number | undefined) ?? 1) * 0.02,
    },
    { n: 3 },
  ) === 0.06,
)
check(
  "computeCost: falls back to baseCost when no getCost",
  computeCost({ id: "x", baseCost: 0.04 }) === 0.04,
)
check(
  "computeCost: falls back to baseCost when getCost returns invalid",
  computeCost({ id: "x", baseCost: 0.04, getCost: () => NaN }) === 0.04,
)
check(
  "computeCost: 0 when baseCost negative/invalid and no getCost",
  computeCost({ id: "x", baseCost: -1 }) === 0,
)

async function main() {
  // -- recordGenerationCost happy path ----------------------------------
  const captured: CostRecord[] = []
  setCostSink((record) => {
    captured.push(record)
  })

  await recordGenerationCost({
    generation_id: "gen_abc",
    user_id: "user_1",
    provider: "apimart",
    model: "nano-banana-2",
    cost_usd: 0.05,
    status: "completed",
    meta: { prompt_chars: 42 },
  })

  check("record: sink called exactly once", captured.length === 1)
  check("record: generation_id preserved", captured[0].generation_id === "gen_abc")
  check("record: timestamp is ISO 8601", !Number.isNaN(Date.parse(captured[0].timestamp)))
  check("record: meta preserved", (captured[0].meta as { prompt_chars?: number })?.prompt_chars === 42)

  // -- failing sink is swallowed ----------------------------------------
  setCostSink(() => {
    throw new Error("sink explode")
  })

  let threw = false
  try {
    await recordGenerationCost({
      generation_id: "gen_bad",
      user_id: "user_2",
      provider: "poyo",
      model: "kling-2.5-turbo",
      cost_usd: 0.1,
      status: "failed",
    })
  } catch {
    threw = true
  }
  check("record: throwing sink does not propagate", threw === false)

  // -- async sink is awaited --------------------------------------------
  const order: string[] = []
  setCostSink(async (r) => {
    order.push(`start:${r.generation_id}`)
    await new Promise((resolve) => setTimeout(resolve, 5))
    order.push(`end:${r.generation_id}`)
  })

  await recordGenerationCost({
    generation_id: "gen_async",
    user_id: "user_3",
    provider: "apimart",
    model: "nano-banana-2",
    cost_usd: 0.02,
    status: "completed",
  })

  check(
    "record: async sink awaited before return",
    order.join(",") === "start:gen_async,end:gen_async",
  )

  // -- status enum accepted ---------------------------------------------
  const statuses: Array<CostRecord["status"]> = ["completed", "failed", "partial"]
  const statusCapture: CostRecord[] = []
  setCostSink((r) => {
    statusCapture.push(r)
  })
  for (const status of statuses) {
    await recordGenerationCost({
      generation_id: `gen_${status}`,
      user_id: "user_4",
      provider: "apimart",
      model: "nano-banana-2",
      cost_usd: 0.01,
      status,
    })
  }
  check("record: all status values accepted", statusCapture.length === 3 && statusCapture.map((r) => r.status).join(",") === "completed,failed,partial")

  setCostSink(null)
  setLogSink(null)

  console.log(`\n${passed}/${passed + failed} passed`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error("smoke crashed:", err)
  process.exit(2)
})
