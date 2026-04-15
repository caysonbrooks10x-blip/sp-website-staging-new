/**
 * Offline smoke test for lib/env.ts.
 *
 * Exercises dummy detection, requireEnv dev/prod behaviour, and the
 * aggregated assertRequiredEnv path. Run:
 *   npx tsx scripts/verify-env.ts
 */

import { isDummy, optionalEnv, requireEnv, assertRequiredEnv, isProduction } from "../lib/env"

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

function runInEnv(env: "production" | "development" | "test", fn: () => void) {
  // Next.js's process.env types mark NODE_ENV as read-only; cast to bypass
  // that at the TS layer — runtime semantics are unchanged.
  const envBag = process.env as Record<string, string | undefined>
  const savedNodeEnv = envBag.NODE_ENV
  const savedVercelEnv = envBag.VERCEL_ENV
  try {
    envBag.NODE_ENV = env
    delete envBag.VERCEL_ENV
    fn()
  } finally {
    if (savedNodeEnv === undefined) delete envBag.NODE_ENV
    else envBag.NODE_ENV = savedNodeEnv
    if (savedVercelEnv !== undefined) envBag.VERCEL_ENV = savedVercelEnv
  }
}

// -- isDummy -------------------------------------------------------------

check("isDummy: undefined is dummy", isDummy(undefined) === true)
check("isDummy: empty string is dummy", isDummy("") === true)
check("isDummy: AIzaSyDUMMY marker", isDummy("AIzaSyDUMMY1234") === true)
check("isDummy: demo-project marker", isDummy("demo-project") === true)
check("isDummy: your-project-id marker", isDummy("your-project-id") === true)
check("isDummy: real value passes", isDummy("AIzaSyBrealrealreal") === false)
check("isDummy: trimmed empty string is dummy", isDummy("   ") === true)

// -- optionalEnv ---------------------------------------------------------

process.env.TEST_ENV_VAR = "real-value"
check("optionalEnv: returns real value", optionalEnv("TEST_ENV_VAR") === "real-value")
process.env.TEST_ENV_VAR = "your-project-id"
check("optionalEnv: returns undefined for dummy", optionalEnv("TEST_ENV_VAR") === undefined)
delete process.env.TEST_ENV_VAR
check("optionalEnv: returns undefined for missing", optionalEnv("TEST_ENV_VAR") === undefined)

// -- requireEnv in dev ---------------------------------------------------

runInEnv("development", () => {
  delete process.env.TEST_ENV_VAR
  const warn = console.warn
  let warnCount = 0
  console.warn = () => {
    warnCount += 1
  }
  try {
    const v = requireEnv("TEST_ENV_VAR", { devFallback: "fallback-val" })
    check("requireEnv[dev]: returns devFallback when missing", v === "fallback-val")
    check("requireEnv[dev]: warns when missing", warnCount >= 1)
  } finally {
    console.warn = warn
  }
})

// -- requireEnv in production throws ------------------------------------

runInEnv("production", () => {
  delete process.env.TEST_ENV_VAR
  let threw = false
  try {
    requireEnv("TEST_ENV_VAR")
  } catch {
    threw = true
  }
  check("requireEnv[prod]: throws when missing", threw === true)

  process.env.TEST_ENV_VAR = "demo-project"
  threw = false
  try {
    requireEnv("TEST_ENV_VAR")
  } catch {
    threw = true
  }
  check("requireEnv[prod]: throws when dummy", threw === true)

  process.env.TEST_ENV_VAR = "real-value-xyz"
  const v = requireEnv("TEST_ENV_VAR")
  check("requireEnv[prod]: returns real value", v === "real-value-xyz")
})

// -- assertRequiredEnv ---------------------------------------------------

runInEnv("development", () => {
  // No-op in non-production.
  assertRequiredEnv(["MISSING_KEY_A", "MISSING_KEY_B"])
  check("assertRequiredEnv[dev]: no-op when missing", true)
})

runInEnv("production", () => {
  delete process.env.MISSING_KEY_A
  delete process.env.MISSING_KEY_B
  let err: Error | null = null
  try {
    assertRequiredEnv(["MISSING_KEY_A", "MISSING_KEY_B"])
  } catch (e) {
    err = e as Error
  }
  check("assertRequiredEnv[prod]: throws aggregated error", err !== null)
  check(
    "assertRequiredEnv[prod]: error mentions all missing keys",
    err?.message.includes("MISSING_KEY_A") === true && err?.message.includes("MISSING_KEY_B") === true,
    err?.message,
  )
})

// -- isProduction --------------------------------------------------------

runInEnv("development", () => {
  check("isProduction[dev]: false", !isProduction())
})
runInEnv("production", () => {
  check("isProduction[prod]: true", isProduction())
})

delete process.env.TEST_ENV_VAR
delete process.env.MISSING_KEY_A
delete process.env.MISSING_KEY_B

console.log(`\n${passed}/${passed + failed} passed`)
if (failed > 0) process.exit(1)
