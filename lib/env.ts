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

type Env = "production" | "preview" | "development" | "test"

const PRODUCTION_VERCEL_HOSTS = new Set([
  "sp-website-staging-new.vercel.app",
])

function browserHostname(): string | undefined {
  if (typeof window === "undefined") return undefined
  return window.location.hostname.toLowerCase()
}

function currentEnv(): Env {
  const explicitVercelEnv =
    process.env.NEXT_PUBLIC_VERCEL_ENV?.trim() || process.env.VERCEL_ENV?.trim()

  if (explicitVercelEnv === "production") return "production"
  if (explicitVercelEnv === "preview") return "preview"
  if (process.env.NODE_ENV === "test") return "test"

  const hostname = browserHostname()
  if (hostname?.endsWith(".vercel.app")) {
    return PRODUCTION_VERCEL_HOSTS.has(hostname) ? "production" : "preview"
  }

  if (process.env.NODE_ENV === "production") return "production"
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
  opts: { devFallback?: string; previewFallback?: string; silent?: boolean; raw?: string } = {},
): string {
  // Prefer the caller-supplied `raw` value — callers should pass
  // `process.env.NEXT_PUBLIC_*` as a static literal so Next.js can
  // inline it into the client bundle via DefinePlugin. Dynamic access
  // like `process.env[name]` is NOT inlined and resolves to undefined
  // in the browser.
  const raw = (opts.raw ?? process.env[name])?.trim()
  if (raw && !isDummy(raw)) return raw

  if (isProduction()) {
    throw new Error(
      `[env] ${name} is required in production but is missing or is a placeholder. ` +
        `Set it in the Vercel project's Environment Variables.`,
    )
  }

  if (currentEnv() === "preview" && opts.previewFallback !== undefined) {
    if (!opts.silent) {
      console.warn(
        `[env] ${name} is missing or placeholder in preview — using preview fallback.`,
      )
    }
    return opts.previewFallback
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
