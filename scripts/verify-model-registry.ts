/**
 * Model registry consistency audit.
 *
 * Sprint B · Phase 3 · #11 from final_fixes.pdf — "Every model has:
 * cost, provider mapping, supported params. No duplicate or inconsistent
 * entries."
 *
 * Three registries must agree on the set of model IDs:
 *   - IMAGE_MODELS + VIDEO_MODELS   (lib/model-config.ts)     → cost + params
 *   - MODEL_CAPABILITIES            (lib/model-capabilities.ts) → validator
 *   - MODEL_PROVIDERS               (lib/provider-routing.ts)   → provider map
 *
 * Divergence = silent runtime breakage. This audit runs in CI and
 * fails the build if any registry is out of sync.
 *
 * Run: npx tsx scripts/verify-model-registry.ts
 */

import { IMAGE_MODELS, VIDEO_MODELS } from "../lib/model-config"
import { MODEL_CAPABILITIES } from "../lib/model-capabilities"
import { MODEL_PROVIDERS } from "../lib/provider-routing"

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

const imageIds = Object.keys(IMAGE_MODELS)
const videoIds = Object.keys(VIDEO_MODELS)
const configIds = new Set<string>([...imageIds, ...videoIds])
const capabilityIds = new Set(Object.keys(MODEL_CAPABILITIES))
const providerIds = new Set(Object.keys(MODEL_PROVIDERS))

// -- no ID collides between image and video registries ------------------

const collisions = imageIds.filter((id) => videoIds.includes(id))
check("no image/video id collisions", collisions.length === 0, collisions)

// -- no duplicate within each config bucket ----------------------------
// Record<string,…> can't actually duplicate at runtime, but the `id`
// field inside each entry can diverge from its key. Catch that.

for (const [key, cfg] of Object.entries(IMAGE_MODELS)) {
  check(`image registry key matches entry.id for ${key}`, cfg.id === key, { key, entryId: cfg.id })
}
for (const [key, cfg] of Object.entries(VIDEO_MODELS)) {
  check(`video registry key matches entry.id for ${key}`, cfg.id === key, { key, entryId: cfg.id })
}

// -- every model in config has a capability entry ---------------------
// (The validator is tolerant of unknown models, but in a first-party
// registry the entry must exist or we lose per-model rules silently.)

for (const id of configIds) {
  check(`capability entry exists for ${id}`, capabilityIds.has(id))
}

// -- every model in config has a provider mapping --------------------

for (const id of configIds) {
  check(`provider mapping exists for ${id}`, providerIds.has(id))
}

// -- no capability entry without a config entry ------------------------
// (Orphan capability → validator reports rules for a model nobody can
// pick from the UI. Accept as warning, not hard-fail, since some legacy
// ids may stick around during transitions.)

const orphanCaps = [...capabilityIds].filter((id) => !configIds.has(id))
if (orphanCaps.length > 0) {
  console.warn(`  ⚠ orphan capability entries (no config): ${orphanCaps.join(", ")}`)
}

// -- no provider entry without a config entry ------------------------

const orphanProviders = [...providerIds].filter((id) => !configIds.has(id))
if (orphanProviders.length > 0) {
  console.warn(`  ⚠ orphan provider entries (no config): ${orphanProviders.join(", ")}`)
}

// -- every model has a non-negative baseCost ---------------------------

for (const [id, cfg] of Object.entries(IMAGE_MODELS)) {
  const ok = typeof cfg.baseCost === "number" && Number.isFinite(cfg.baseCost) && cfg.baseCost >= 0
  check(`image ${id}: baseCost is a non-negative finite number`, ok, cfg.baseCost)
}
for (const [id, cfg] of Object.entries(VIDEO_MODELS)) {
  const ok = typeof cfg.baseCost === "number" && Number.isFinite(cfg.baseCost) && cfg.baseCost >= 0
  check(`video ${id}: baseCost is a non-negative finite number`, ok, cfg.baseCost)
}

// -- every model has a getCost function ------------------------------

for (const [id, cfg] of Object.entries(IMAGE_MODELS)) {
  check(`image ${id}: getCost is a function`, typeof cfg.getCost === "function")
}
for (const [id, cfg] of Object.entries(VIDEO_MODELS)) {
  check(`video ${id}: getCost is a function`, typeof cfg.getCost === "function")
}

// -- getCost returns a finite, non-negative number for the default params

for (const [id, cfg] of Object.entries(IMAGE_MODELS)) {
  try {
    const n = cfg.getCost({ resolution: cfg.defaultResolution, n: 1 })
    check(`image ${id}: getCost(default) is non-negative finite`, typeof n === "number" && Number.isFinite(n) && n >= 0, n)
  } catch (err) {
    check(`image ${id}: getCost(default) does not throw`, false, err)
  }
}
for (const [id, cfg] of Object.entries(VIDEO_MODELS)) {
  try {
    const n = cfg.getCost({
      duration: cfg.defaultDuration,
      resolution: cfg.defaultResolution,
      aspectRatio: cfg.aspectRatioOptions?.[0],
    } as Parameters<typeof cfg.getCost>[0])
    check(`video ${id}: getCost(default) is non-negative finite`, typeof n === "number" && Number.isFinite(n) && n >= 0, n)
  } catch (err) {
    check(`video ${id}: getCost(default) does not throw`, false, err)
  }
}

// -- capability.kind matches config bucket -----------------------------

for (const id of imageIds) {
  const cap = MODEL_CAPABILITIES[id]
  if (cap) check(`image ${id}: capability.kind === "image"`, cap.kind === "image")
}
for (const id of videoIds) {
  const cap = MODEL_CAPABILITIES[id]
  if (cap) check(`video ${id}: capability.kind === "video"`, cap.kind === "video")
}

console.log(`\n${passed}/${passed + failed} passed`)
if (failed > 0) process.exit(1)
