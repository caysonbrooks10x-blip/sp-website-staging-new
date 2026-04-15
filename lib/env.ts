/**
 * Centralised environment variable access + validation.
 *
 * Rules:
 *   - In production, missing or dummy values for REQUIRED keys throw.
 *     App must not boot with demo Firebase creds in prod.
 *   - In development, missing values log a warning and fall back to a
 *     safe sentinel so local iteration still works.
 *   - "Dummy" values (AIzaSyDUMMY..., demo-project, your-*) are always
 *     treated as missing, regardless of environment.
 */

type Env = "production" | "development" | "test"

function currentEnv(): Env {
  if (process.env.VERCEL_ENV === "production") return "production"
  if (process.env.NODE_ENV === "production") return "production"
  if (process.env.NODE_ENV === "test") return "test"
  return "development"
}

export function isProduction(): boolean {
  return currentEnv() === "production"
}

const DUMMY_MARKERS = [
  "AIzaSyDUMMY",
  "demo-project",
  "demo.firebaseapp.com",
  "demo.appspot.com",
  "1234567890",
  "G-DEMO",
  "your-",
  "YOUR_",
  "_here",
]

export function isDummy(value: string | undefined | null): boolean {
  if (!value) return true
  const trimmed = value.trim()
  if (!trimmed) return true
  return DUMMY_MARKERS.some((marker) => trimmed.includes(marker))
}

/**
 * Returns the env value, or throws in production if missing/dummy.
 * In non-production, returns the fallback and logs a warning.
 */
export function requireEnv(
  name: string,
  opts: { devFallback?: string; silent?: boolean } = {},
): string {
  const raw = process.env[name]?.trim()
  if (raw && !isDummy(raw)) return raw

  if (isProduction()) {
    throw new Error(
      `[env] ${name} is required in production but is missing or is a placeholder. ` +
        `Set it in the Vercel project's Environment Variables.`,
    )
  }

  if (!opts.silent) {
    console.warn(
      `[env] ${name} is missing or placeholder in ${currentEnv()} — using dev fallback.`,
    )
  }
  return opts.devFallback ?? ""
}

/** Optional env — returns trimmed value or undefined. */
export function optionalEnv(name: string): string | undefined {
  const raw = process.env[name]?.trim()
  if (!raw || isDummy(raw)) return undefined
  return raw
}

/**
 * Validates that a set of required env vars is present in production.
 * Intended to be called once at module load from server-only code.
 * Throws a single aggregated error listing every missing key.
 */
export function assertRequiredEnv(keys: readonly string[]): void {
  if (!isProduction()) return
  const missing: string[] = []
  for (const key of keys) {
    const raw = process.env[key]?.trim()
    if (!raw || isDummy(raw)) missing.push(key)
  }
  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required production env vars: ${missing.join(", ")}. ` +
        `Configure them in the Vercel project settings before deploying.`,
    )
  }
}
