/**
 * Live end-to-end test for Nano Banana 2 reference-image editing.
 *
 * Closes the old handoff's #1 validation item: "confirm Nano Banana 2
 * reference-image editing actually works end-to-end."
 *
 * Run:
 *   APIMART_API_KEY=... POYO_API_KEY=... npx tsx scripts/verify-nano-banana-live.ts
 *
 * Optional env:
 *   REF_IMAGE_URL  — public URL of a test reference image. Defaults
 *                    to a public sample if unset.
 *   PROMPT         — edit instruction. Defaults to a generic one.
 *
 * What it does:
 *   1. Calls ApiMart /v1/images/generations with nano-banana-2 + the
 *      ref image. Polls the returned task_id until terminal.
 *   2. Repeats for nano-banana-2-new.
 *   3. Repeats for nano-banana-2-new-edit on Poyo (the edit variant
 *      auto-switch the previous developer added).
 *   4. Prints task_id, final state, output URLs, and elapsed time so
 *      you can paste cost figures into the QA matrix.
 *
 * It does NOT exercise our Next.js proxy routes — it hits the upstream
 * APIs directly so we can isolate "does the upstream accept our payload"
 * from "is our proxy code wired right." If this script passes but the
 * UI fails, the bug is in the proxy or page; if this fails, the bug is
 * in the payload shape.
 */

const APIMART_BASE = "https://api.apimart.ai/v1"
const POYO_BASE = "https://api.poyo.ai"

const REF_IMAGE_URL =
  process.env.REF_IMAGE_URL ||
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/640px-Cat03.jpg"
const PROMPT = process.env.PROMPT || "Make the subject wear a small red bow tie. Keep everything else identical."

const APIMART_KEY = process.env.APIMART_API_KEY
const POYO_KEY = process.env.POYO_API_KEY

if (!APIMART_KEY) {
  console.error("APIMART_API_KEY is not set. Aborting.")
  process.exit(2)
}

type Result = {
  label: string
  ok: boolean
  taskId?: string
  state?: string
  outputs?: string[]
  elapsedMs?: number
  error?: string
}

async function pollApiMart(taskId: string, deadlineMs = 180_000): Promise<{ state: string; outputs: string[] }> {
  const start = Date.now()
  while (Date.now() - start < deadlineMs) {
    await new Promise((r) => setTimeout(r, 3000))
    const resp = await fetch(`${APIMART_BASE}/tasks/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${APIMART_KEY}` },
    })
    const json: any = await resp.json()
    const task = json?.data ?? json
    const state = task?.status || task?.state
    if (state === "succeeded" || state === "completed" || state === "success") {
      const images = task?.result?.images || task?.images || []
      const flat = Array.isArray(images)
        ? images.flatMap((g: any) => (Array.isArray(g?.url) ? g.url : g?.url ? [g.url] : []))
        : []
      return { state, outputs: flat }
    }
    if (state === "failed" || state === "error") {
      throw new Error(`task failed: ${task?.error || JSON.stringify(task)}`)
    }
  }
  throw new Error("polling timeout")
}

async function pollPoyo(taskId: string, deadlineMs = 180_000): Promise<{ state: string; outputs: string[] }> {
  const start = Date.now()
  while (Date.now() - start < deadlineMs) {
    await new Promise((r) => setTimeout(r, 3000))
    const resp = await fetch(`${POYO_BASE}/api/generate/status/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${POYO_KEY}` },
    })
    const json: any = await resp.json()
    const data = json?.data ?? json
    const state = data?.state || data?.status
    if (state === "succeeded" || state === "success" || state === "completed") {
      const outs: string[] = []
      const collect = (v: any) => {
        if (typeof v === "string" && v.startsWith("http")) outs.push(v)
        else if (Array.isArray(v)) v.forEach(collect)
        else if (v && typeof v === "object") Object.values(v).forEach(collect)
      }
      collect(data?.outputs ?? data?.result ?? data)
      return { state, outputs: outs }
    }
    if (state === "failed" || state === "error") {
      throw new Error(`task failed: ${data?.error || JSON.stringify(data)}`)
    }
  }
  throw new Error("polling timeout")
}

async function runApiMart(label: string, model: string): Promise<Result> {
  const start = Date.now()
  try {
    const wireModel = resolveProviderModelId(model, "apimart")
    const resp = await fetch(`${APIMART_BASE}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APIMART_KEY}`,
      },
      body: JSON.stringify({
        model: wireModel,
        prompt: PROMPT,
        image_urls: [REF_IMAGE_URL],
        n: 1,
      }),
    })
    const json: any = await resp.json()
    if (!resp.ok) {
      return { label, ok: false, error: `submit ${resp.status}: ${JSON.stringify(json)}`, elapsedMs: Date.now() - start }
    }
    const taskId = json?.data?.[0]?.task_id
    if (!taskId) {
      const directUrl = json?.data?.[0]?.url
      if (directUrl) {
        return { label, ok: true, state: "direct", outputs: [directUrl], elapsedMs: Date.now() - start }
      }
      return { label, ok: false, error: `no task_id and no direct url in response: ${JSON.stringify(json)}`, elapsedMs: Date.now() - start }
    }
    const polled = await pollApiMart(taskId)
    return { label, ok: true, taskId, state: polled.state, outputs: polled.outputs, elapsedMs: Date.now() - start }
  } catch (e: any) {
    return { label, ok: false, error: e?.message || String(e), elapsedMs: Date.now() - start }
  }
}

async function runPoyo(label: string, model: string): Promise<Result> {
  if (!POYO_KEY) {
    return { label, ok: false, error: "POYO_API_KEY not set; skipped" }
  }
  const start = Date.now()
  try {
    const resp = await fetch(`${POYO_BASE}/api/generate/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${POYO_KEY}`,
      },
      body: JSON.stringify({
        model,
        inputs: {
          prompt: PROMPT,
          image_urls: [REF_IMAGE_URL],
        },
      }),
    })
    const json: any = await resp.json()
    if (!resp.ok) {
      return { label, ok: false, error: `submit ${resp.status}: ${JSON.stringify(json)}`, elapsedMs: Date.now() - start }
    }
    const taskId = json?.data?.task_id || json?.task_id
    if (!taskId) {
      return { label, ok: false, error: `no task_id in response: ${JSON.stringify(json)}`, elapsedMs: Date.now() - start }
    }
    const polled = await pollPoyo(taskId)
    return { label, ok: true, taskId, state: polled.state, outputs: polled.outputs, elapsedMs: Date.now() - start }
  } catch (e: any) {
    return { label, ok: false, error: e?.message || String(e), elapsedMs: Date.now() - start }
  }
}

async function main() {
  console.log(`Reference image: ${REF_IMAGE_URL}`)
  console.log(`Prompt: ${PROMPT}\n`)

  const results: Result[] = []
  results.push(await runApiMart("A3 ApiMart nano-banana-2 +ref", "nano-banana-2"))
  results.push(await runApiMart("A7 ApiMart nano-banana-2-new +ref", "nano-banana-2-new"))
  results.push(await runPoyo("Poyo nano-banana-2-new-edit +ref", "nano-banana-2-new-edit"))

  console.log("\n=== Results ===")
  for (const r of results) {
    const time = r.elapsedMs ? `${(r.elapsedMs / 1000).toFixed(1)}s` : "-"
    if (r.ok) {
      console.log(`PASS  ${r.label}  [${time}]  task=${r.taskId || "n/a"}  state=${r.state}`)
      r.outputs?.forEach((u) => console.log(`        out: ${u}`))
    } else {
      console.log(`FAIL  ${r.label}  [${time}]`)
      console.log(`        ${r.error}`)
    }
  }
  const failed = results.filter((r) => !r.ok).length
  console.log(`\nSummary: ${results.length - failed}/${results.length} passed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
import { resolveProviderModelId } from "../lib/provider-routing"
