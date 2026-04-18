import { getModelCredits } from "../lib/model-credits"
import { IMAGE_MODEL_LIST, VIDEO_MODEL_LIST } from "../lib/model-config"

const expected: Record<string, number> = {
  // image — default config
  "gpt-4o-image": 12, "gpt-image-1.5": 7,
  "nano-banana": 15, "nano-banana-2": 15, "nano-banana-2-new": 15,
  "nano-banana-2-official": 33, "nano-banana-pro": 30,
  "flux-2-pro": 18, "flux-2-flex": 54,
  "flux-kontext-pro": 24, "flux-kontext-max": 48,
  "seedream-4.5": 17, "seedream-5.0-lite": 17,
  "z-image": 7, "qwen-image-2.0-pro": 30,
  "wan-2.7-image-pro": 32, "kling-o3-image": 11, "grok-imagine-image": 18,
  // video — default config per spec
  "grok-vid": 90,                 // 6s
  "hailuo-2.3": 105,              // 6s 768p
  "wan2.6-text-to-video": 240,    // 5s 720p → 0.080*5=0.400 → 240
  "doubao-seedance-2.0": 60,      // 4s 480p → 0.100 → 60
  "veo3.1-lite": 24, "veo3.1-fast-official": 48, "veo3.1-quality-official": 96,
  "kling-v3-omni": 41, "kling-video-o1": 41,
  "wan2.6-video-to-video": 240,   // 5s 720p
  "runway-gen-4.5": 225,          // 5s → 0.375
}

const defaults: Record<string, any> = {
  "grok-vid": { duration: 6 },
  "hailuo-2.3": { resolution: "768p", duration: 6 },
  "wan2.6-text-to-video": { resolution: "720p", duration: 5 },
  "doubao-seedance-2.0": { resolution: "480p", duration: 4 },
  "kling-v3-omni": { resolution: "1080p", duration: 5 },
  "kling-video-o1": { resolution: "1080p", duration: 5 },
  "wan2.6-video-to-video": { resolution: "720p", duration: 5 },
  "runway-gen-4.5": { duration: 5 },
  "nano-banana-2-official": { resolution: "1K" },
  "flux-2-pro": { resolution: "1K" },
  "flux-2-flex": { resolution: "1K" },
}

let fail = 0
for (const [id, exp] of Object.entries(expected)) {
  const actual = getModelCredits(id, defaults[id] ?? {})
  const ok = actual === exp
  console.log(`${ok ? "OK " : "FAIL"} ${id.padEnd(30)} expected=${exp} actual=${actual}`)
  if (!ok) fail++
}

// Model list coverage
const ids = [...IMAGE_MODEL_LIST.map(m => m.id), ...VIDEO_MODEL_LIST.map(m => m.id)]
const missing = ids.filter(id => !(id in expected))
if (missing.length) console.log("\nMISSING FROM EXPECTED:", missing)

process.exit(fail > 0 ? 1 : 0)
