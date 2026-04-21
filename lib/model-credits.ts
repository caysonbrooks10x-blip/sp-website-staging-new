/**
 * Universal source of truth for per-generation credit cost.
 *
 * Policy (approved 2026-04-19):
 *   credits = calcCredits( max(primary_api_cost, fallback_api_cost) )
 *
 * We charge on the worst-case provider so the user is never under-charged
 * regardless of which side the router fires. See AI_Platform_Pricing_Spec_v2.
 *
 * Single file, imported by:
 *   - lib/model-config.ts  (getCost per model)
 *   - components/studio/left-panel.tsx (Generate button label)
 *   - app/api/route/*      (debit)
 *   - bot-patches/2026-04-19_sync_credit_costs.py (bot mirror)
 *
 * If a price changes: edit MODEL_CHARGE_USD or a dispatcher below,
 * regenerate the bot patch, replay. One PR → every surface updates.
 */

export function calcCredits(apiCostUSD: number): number {
  if (!apiCostUSD || apiCostUSD <= 0) return 0
  const mult = apiCostUSD <= 0.01 ? 3.5 : 3.0
  const raw = (apiCostUSD * mult) / 0.005
  return Math.ceil(Math.round(raw * 1e8) / 1e8)
}

export interface CreditConfigInput {
  resolution?: string
  duration?: number | string
  n?: number
  aspect_ratio?: string
}

/**
 * Flat charge per model in USD — max(primary, fallback) at default config.
 * Config-variable models (listed in MODEL_CHARGE_BY_CONFIG) override this.
 */
export const MODEL_CHARGE_USD: Record<string, number> = {
  // image — 18 models
  "gpt-4o-image": 0.020,
  "gpt-image-1.5": 0.010,
  "nano-banana": 0.025,
  "nano-banana-2": 0.025,
  "nano-banana-2-new": 0.025,
  "nano-banana-2-official": 0.0536, // varies by res (see dispatcher)
  "nano-banana-pro": 0.050,
  "flux-2-pro": 0.030,               // varies by res
  "flux-2-flex": 0.090,               // varies by res
  "flux-kontext-pro": 0.040,
  "flux-kontext-max": 0.080,
  "seedream-4.5": 0.028,
  "seedream-5.0-lite": 0.028,
  "z-image": 0.010,
  "qwen-image-2.0-pro": 0.050,
  "wan-2.7-image-pro": 0.052,
  "kling-o3-image": 0.018,
  "grok-imagine-image": 0.030,
  // video — 11 models
  "grok-vid": 0.150,
  "hailuo-2.3": 0.175,                // varies by duration+res
  "wan2.6-text-to-video": 0.400,      // varies by duration+res
  "doubao-seedance-2.0": 0.100,       // varies by res
  "veo3.1-lite": 0.040,
  "veo3.1-fast-official": 0.080,
  "veo3.1-quality-official": 0.160,
  "kling-v3-omni": 0.0672,
  "kling-video-o1": 0.0672,
  "wan2.6-video-to-video": 0.400,     // varies by duration+res
  "runway-gen-4.5": 0.375,            // varies by duration
}

type Dispatcher = (c: CreditConfigInput) => number

const num = (v: unknown, fallback: number): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

/**
 * Per-model config-variable USD cost. Returns the route-max price for the
 * given config. Every branch uses `max(primary, fallback)` per the approved
 * pricing spec §4.
 */
export const MODEL_CHARGE_BY_CONFIG: Record<string, Dispatcher> = {
  "nano-banana-2-official": ({ resolution = "1K" }) => {
    if (resolution === "4K") return 0.1072
    if (resolution === "2K") return 0.075
    return 0.0536 // 0.5K + 1K
  },

  "flux-2-pro": ({ resolution = "1K" }) => (resolution === "2K" ? 0.045 : 0.030),
  "flux-2-flex": ({ resolution = "1K" }) => (resolution === "2K" ? 0.135 : 0.090),
  "nano-banana-2": ({ resolution = "2K" }) => (resolution === "2K" ? 0.0375 : 0.025),
  "nano-banana-2-new": ({ resolution = "2K" }) => (resolution === "2K" ? 0.0375 : 0.025),

  "hailuo-2.3": ({ resolution = "768p", duration = 6 }) => {
    const d = num(duration, 6)
    if (resolution === "1080p") return 0.300
    return d >= 10 ? 0.350 : 0.175
  },

  "wan2.6-text-to-video": ({ resolution = "720p", duration = 5 }) => {
    const d = num(duration, 5)
    const perSecond = resolution === "1080p" ? 0.120 : 0.080
    return perSecond * d
  },

  "wan2.6-video-to-video": ({ resolution = "720p", duration = 5 }) => {
    const d = num(duration, 5)
    const perSecond = resolution === "1080p" ? 0.120 : 0.080
    return perSecond * d
  },

  "doubao-seedance-2.0": ({ resolution = "1080p" }) => {
    if (resolution === "4K") return 0.800
    if (resolution === "2K") return 0.400
    if (resolution === "1080p") return 0.200
    return 0.100 // 720p and below
  },

  "runway-gen-4.5": ({ duration = 5 }) => {
    const d = num(duration, 5)
    return 0.075 * d
  },
}

/**
 * Main entry point. Returns integer credits for a model at a given config.
 * Scales by `n` for image batch generation.
 */
export function getModelCredits(modelId: string, config: CreditConfigInput = {}): number {
  const dispatcher = MODEL_CHARGE_BY_CONFIG[modelId]
  const usd = dispatcher ? dispatcher(config) : MODEL_CHARGE_USD[modelId]
  if (usd === undefined) return 0 // unknown model — let validator handle

  const base = calcCredits(usd)
  const n = Math.max(1, Math.floor(num(config.n, 1)))
  return base * n
}

/** Convenience for the Generate button. */
export function formatCreditsLabel(credits: number): string {
  if (credits <= 0) return "Generate"
  return `Generate · ${credits} credit${credits === 1 ? "" : "s"}`
}
