/**
 * 2-Step AR Pipeline (handoff §10).
 *
 * Problem: most image-to-video models ignore the caller's `aspect_ratio`
 * when a reference image is supplied — they derive AR from the image.
 * If the user uploads a 1:1 image but asks for a 16:9 video, the model
 * silently outputs 1:1.
 *
 * Fix: before kicking off the video job, run a cheap image-edit step
 * that re-frames the reference image to the target AR, then feed the
 * re-framed output as the video model's input.
 *
 *   Step 1 (Poyo):    `nano-banana-2-new-edit` — $0.025, ~30–120s.
 *   Step 1 (ApiMart): `gemini-3.1-flash-image-preview` — same cost tier,
 *                     used when caller needs n>1 or extreme AR.
 *   Step 2:           the user's selected video model with
 *                     image_urls = [step1_output_url].
 *
 * Sprint A Step 3: the env flag NEXT_PUBLIC_STUDIO_TWO_STEP is gone.
 * This pipeline is now AUTO — it runs whenever the chosen video model
 * ignores aspect_ratio on its reference image AND the reference AR
 * doesn't already match the target. The caller still has the escape
 * hatch of setting `alreadyApplied: true` to prevent loops (e.g. when
 * the reframed image is itself being resubmitted).
 */

import type { StudioProvider } from "@/lib/provider-routing"

export const STEP_ONE_FIXED_COST_USD = 0.025

export type TwoStepPhase =
  | "idle"
  | "uploading"
  | "step1:queued"
  | "step1:running"
  | "step1:done"
  | "step2:queued"
  | "step2:running"
  | "step2:done"
  | "failed"

export interface TwoStepState {
  phase: TwoStepPhase
  step1TaskId?: string
  step1OutputUrl?: string
  step2TaskId?: string
  error?: string
  startedAt: number
  updatedAt: number
}

export function createTwoStepState(): TwoStepState {
  const now = Date.now()
  return { phase: "idle", startedAt: now, updatedAt: now }
}

export function advanceTwoStepState(state: TwoStepState, patch: Partial<TwoStepState>): TwoStepState {
  return { ...state, ...patch, updatedAt: Date.now() }
}

const EXTREME_AR = new Set(["1:4", "4:1", "1:8", "8:1"])

function parseRatio(ratio?: string): number | null {
  if (!ratio) return null
  const parts = ratio.split(":")
  if (parts.length !== 2) return null
  const w = Number(parts[0])
  const h = Number(parts[1])
  if (!w || !h || !Number.isFinite(w) || !Number.isFinite(h)) return null
  return w / h
}

/**
 * Heuristic: given the reference image's aspect ratio and the target
 * output AR, decide whether a reframing step is needed. Returns false
 * if either is missing (unknown → skip; the user explicitly opted in).
 */
export function referenceArMismatchesTarget(
  referenceAr: string | undefined,
  targetAr: string | undefined,
  tolerance = 0.05,
): boolean {
  const a = parseRatio(referenceAr)
  const b = parseRatio(targetAr)
  if (a === null || b === null) return false
  return Math.abs(a - b) / Math.max(a, b) > tolerance
}

/**
 * Picks the step-1 editor model. Uses ApiMart's Gemini preview when the
 * caller asked for multiple outputs or an extreme AR the Poyo variant
 * can't produce; otherwise stays on the cheap Poyo default.
 */
export function pickStepOneModel(params: {
  n?: number
  targetAspectRatio?: string
}): { model: string; provider: StudioProvider } {
  const n = params.n ?? 1
  const extreme = params.targetAspectRatio ? EXTREME_AR.has(params.targetAspectRatio) : false
  if (n > 1 || extreme) {
    return { model: "gemini-3.1-flash-image-preview", provider: "apimart" }
  }
  return { model: "nano-banana-2-new-edit", provider: "poyo" }
}

/**
 * Builds the prompt handed to the step-1 editor. Instructs the image
 * model to preserve subject + style while reframing to the target AR.
 * This is deterministic — no user creativity leaks in because we want
 * step-1 to be idempotent for the same (image, targetAr) pair.
 */
export function buildStepOnePrompt(targetAspectRatio: string): string {
  return [
    "Reframe this image to the target aspect ratio below.",
    `Target aspect ratio: ${targetAspectRatio}.`,
    "Preserve the subject, lighting, style, and composition.",
    "Extend or crop canvas naturally; do not distort the subject.",
    "Do not add new subjects, logos, or text.",
  ].join(" ")
}

/**
 * Display cost in USD to add on top of the video model's own cost.
 * Callers can show this in the generate button so users know why their
 * total bumped up by $0.025 when the flag is active.
 */
export function getStepOneDisplayCost(): number {
  return STEP_ONE_FIXED_COST_USD
}

export type TwoStepInput = {
  referenceImageUrl: string
  targetAspectRatio: string
  referenceAspectRatio?: string
  n?: number
}

export type TwoStepDecision =
  | { needed: false; reason: string }
  | { needed: true; stepOne: { model: string; provider: StudioProvider; prompt: string } }

/**
 * Single entry point the caller uses before dispatching a video job.
 * Auto-triggered: returns `{ needed: true }` whenever the model
 * ignores aspect_ratio on its reference image AND the reference AR
 * doesn't already match the target. Callers pass `alreadyApplied: true`
 * to short-circuit when they're resubmitting a previously-reframed job.
 *
 * When `referenceAspectRatio` is unknown, we conservatively apply the
 * pipeline anyway — the downside is one $0.025 reframing step that
 * returns a compatible image; the upside is no silent AR drift.
 */
export function decideTwoStep(
  input: TwoStepInput,
  opts: { modelIgnoresArOnRef?: boolean; alreadyApplied?: boolean } = {},
): TwoStepDecision {
  if (opts.alreadyApplied) return { needed: false, reason: "two-step already applied to this reference" }
  if (!opts.modelIgnoresArOnRef) return { needed: false, reason: "model respects aspect_ratio on reference" }
  if (!input.referenceImageUrl) return { needed: false, reason: "no reference image to reframe" }
  if (!input.targetAspectRatio) return { needed: false, reason: "no target aspect ratio supplied" }
  if (input.referenceAspectRatio && !referenceArMismatchesTarget(input.referenceAspectRatio, input.targetAspectRatio)) {
    return { needed: false, reason: "reference AR already matches target" }
  }

  const picked = pickStepOneModel({ n: input.n, targetAspectRatio: input.targetAspectRatio })
  return {
    needed: true,
    stepOne: {
      model: picked.model,
      provider: picked.provider,
      prompt: buildStepOnePrompt(input.targetAspectRatio),
    },
  }
}
