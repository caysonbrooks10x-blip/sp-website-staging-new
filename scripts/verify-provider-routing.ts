/**
 * Step 1 smoke test for lib/provider-routing.ts.
 *
 * Run: npx tsx scripts/verify-provider-routing.ts
 *
 * Covers the P0 + P1 bullets from the FULL handoff §11:
 *   - 404-risk models are now Poyo-only
 *   - Nano Banana family lands on ApiMart
 *   - Remix + character flows pin to ApiMart
 *   - Price-preferred models resolve to the cheaper provider
 *   - Param-driven gates (template, camera_movement, kling_elements,
 *     last_frame_image, generation_type=reference, mask_url) override
 *     the default primary
 *   - Health override flips to secondary only when one exists
 */

import { chooseProvider, MODEL_PROVIDERS } from "../lib/provider-routing"

type Case = {
  name: string
  input: Parameters<typeof chooseProvider>[0]
  expected: "poyo" | "apimart"
}

const cases: Case[] = [
  // --- P0: models that must NOT go to ApiMart ---
  { name: "z-image → poyo (P0)", input: { mode: "image", model: "z-image" }, expected: "poyo" },
  { name: "kling-2.5-turbo-pro → poyo (P0)", input: { mode: "video", model: "kling-2.5-turbo-pro" }, expected: "poyo" },
  { name: "sora-2-official → poyo (P0)", input: { mode: "video", model: "sora-2-official" }, expected: "poyo" },
  { name: "kling-3.0-motion-control → poyo (P0)", input: { mode: "video", model: "kling-3.0-motion-control" }, expected: "poyo" },
  { name: "hailuo-02-pro → poyo (P0)", input: { mode: "video", model: "hailuo-02-pro" }, expected: "poyo" },
  { name: "wan-animate-move → poyo (P0)", input: { mode: "video", model: "wan-animate-move" }, expected: "poyo" },
  { name: "wan-animate-replace → poyo (P0)", input: { mode: "video", model: "wan-animate-replace" }, expected: "poyo" },

  // --- Nano Banana family (ApiMart cheaper) ---
  { name: "nano-banana → apimart", input: { mode: "image", model: "nano-banana" }, expected: "apimart" },
  { name: "nano-banana-2 → apimart", input: { mode: "image", model: "nano-banana-2" }, expected: "apimart" },
  { name: "nano-banana-2-new → apimart", input: { mode: "image", model: "nano-banana-2-new" }, expected: "apimart" },
  { name: "nano-banana-pro → poyo (official tier)", input: { mode: "image", model: "nano-banana-pro" }, expected: "poyo" },

  // --- Price-preferred wins ---
  { name: "grok-vid → apimart (21x cheaper)", input: { mode: "video", model: "grok-vid" }, expected: "apimart" },
  { name: "flux-2-pro → apimart", input: { mode: "image", model: "flux-2-pro" }, expected: "apimart" },
  { name: "flux-2-flex → apimart", input: { mode: "image", model: "flux-2-flex" }, expected: "apimart" },
  { name: "wan2.6-text-to-video → apimart", input: { mode: "video", model: "wan2.6-text-to-video" }, expected: "apimart" },
  { name: "seedance-1.5-pro → poyo", input: { mode: "video", model: "seedance-1.5-pro" }, expected: "poyo" },
  { name: "hailuo-02 → poyo", input: { mode: "video", model: "hailuo-02" }, expected: "poyo" },

  // --- Stage 1 hard gates ---
  { name: "remix mode → apimart (unknown model)", input: { mode: "remix", model: "nano-banana" }, expected: "apimart" },

  // --- Stage 2 param gates ---
  {
    name: "wan2.6-text-to-video with template → apimart (explicit)",
    input: { mode: "video", model: "wan2.6-text-to-video", params: { template: "squish" } },
    expected: "apimart",
  },
  {
    name: "hailuo-2.3 with camera_movement → apimart",
    input: { mode: "video", model: "hailuo-2.3", params: { camera_movement: "[推近]" } },
    expected: "apimart",
  },
  {
    name: "nano-banana-2 with extreme AR → apimart",
    input: { mode: "image", model: "nano-banana-2", params: { aspect_ratio: "4:1" } },
    expected: "apimart",
  },
  {
    name: "gpt-image-1.5 with mask_url → apimart",
    input: { mode: "image", model: "gpt-image-1.5", params: { mask_url: "https://x/y.png" } },
    expected: "apimart",
  },
  {
    name: "gpt-image-1.5 default → poyo",
    input: { mode: "image", model: "gpt-image-1.5" },
    expected: "poyo",
  },

  // --- QA matrix Section A: Nano Banana 2 family (rows A3-A9) ---
  // Specifically targets the old handoff's #1 priority validation item.
  { name: "A3 nano-banana-2 n=1 → apimart (primary)", input: { mode: "image", model: "nano-banana-2", params: { n: 1 } }, expected: "apimart" },
  { name: "A4 nano-banana-2 n=2 → apimart (gate n>1)", input: { mode: "image", model: "nano-banana-2", params: { n: 2 } }, expected: "apimart" },
  { name: "A5 nano-banana-2 AR=4:1 → apimart (extreme_ar)", input: { mode: "image", model: "nano-banana-2", params: { aspect_ratio: "4:1" } }, expected: "apimart" },
  { name: "A6 nano-banana-2 res=0.5K → apimart (res gate)", input: { mode: "image", model: "nano-banana-2", params: { resolution: "0.5K" } }, expected: "apimart" },
  { name: "A7 nano-banana-2-new n=1 → apimart (primary)", input: { mode: "image", model: "nano-banana-2-new", params: { n: 1 } }, expected: "apimart" },
  { name: "A8 nano-banana-2-official default → apimart", input: { mode: "image", model: "nano-banana-2-official" }, expected: "apimart" },
  { name: "A9 nano-banana-2-official res=0.5K → poyo (gateToPoyo)", input: { mode: "image", model: "nano-banana-2-official", params: { resolution: "0.5K" } }, expected: "poyo" },

  // --- Stage 4 health fallback ---
  {
    name: "nano-banana with ApiMart down → poyo (has also)",
    input: { mode: "image", model: "nano-banana", liveHealth: "down" },
    expected: "poyo",
  },
  {
    name: "z-image with Poyo down → stays poyo (no secondary)",
    input: { mode: "image", model: "z-image", liveHealth: "down" },
    expected: "poyo",
  },
]

let pass = 0
let fail = 0
const failures: string[] = []

for (const c of cases) {
  const actual = chooseProvider(c.input)
  if (actual === c.expected) {
    pass++
  } else {
    fail++
    failures.push(`FAIL: ${c.name}\n  expected=${c.expected} actual=${actual}\n  input=${JSON.stringify(c.input)}`)
  }
}

console.log(`\nprovider-routing smoke: ${pass}/${cases.length} passed`)
if (fail > 0) {
  console.log(`\n${failures.join("\n\n")}`)
}

// Integrity checks on the MODEL_PROVIDERS map
const mapErrors: string[] = []
for (const [id, entry] of Object.entries(MODEL_PROVIDERS)) {
  if (entry.also?.includes(entry.primary)) {
    mapErrors.push(`${id}: 'also' must not include primary`)
  }
  if (entry.gateToApimart && entry.primary === "apimart") {
    // gateToApimart is a no-op when primary is already apimart — warn only if it's the only gate set
    if (!entry.gateToPoyo) {
      // not fatal, just noisy; allow
    }
  }
}
if (mapErrors.length) {
  console.log(`\nMAP INTEGRITY:`)
  mapErrors.forEach((m) => console.log(`  ${m}`))
}

process.exit(fail > 0 || mapErrors.length > 0 ? 1 : 0)
