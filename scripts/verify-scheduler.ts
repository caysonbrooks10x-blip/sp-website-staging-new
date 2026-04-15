/**
 * Unit tests for the scheduled-job FSM and the 2-step pipeline
 * decision logic. Sprint B · Phase 3 · #9.
 *
 * Run: npx tsx scripts/verify-scheduler.ts
 */

import {
  transitionScheduledJob,
  isTerminalStatus,
  type ScheduledJobStatus,
} from "../lib/scheduled-job-fsm"
import { decideTwoStep, pickStepOneModel } from "../lib/studio-two-step"

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

// ================================================================
// Scheduler lifecycle — create, pause, resume, cancel
// ================================================================

// -- create -------------------------------------------------------------
{
  const r = transitionScheduledJob(undefined, "create")
  check("create: ok from nothing", r.ok && r.nextStatus === "active")
}
{
  const r = transitionScheduledJob("active", "create")
  check("create: rejected when job exists (active)", !r.ok)
}
{
  const r = transitionScheduledJob("paused", "create")
  check("create: rejected when job exists (paused)", !r.ok)
}

// -- pause --------------------------------------------------------------
{
  const r = transitionScheduledJob("active", "pause")
  check("pause: active → paused", r.ok && r.nextStatus === "paused")
}
{
  const r = transitionScheduledJob("paused", "pause")
  check("pause: rejects already-paused", !r.ok)
}
{
  const r = transitionScheduledJob("cancelled", "pause")
  check("pause: rejects from terminal cancelled", !r.ok && r.error?.includes("terminal") === true)
}
{
  const r = transitionScheduledJob("permanently_failed", "pause")
  check("pause: rejects from terminal permanently_failed", !r.ok)
}
{
  const r = transitionScheduledJob(undefined, "pause")
  check("pause: rejects when no job exists", !r.ok)
}

// -- resume -------------------------------------------------------------
{
  const r = transitionScheduledJob("paused", "resume")
  check("resume: paused → active", r.ok && r.nextStatus === "active")
}
{
  const r = transitionScheduledJob("active", "resume")
  check("resume: rejects already-active", !r.ok)
}
{
  const r = transitionScheduledJob("cancelled", "resume")
  check("resume: rejects from terminal", !r.ok)
}
{
  const r = transitionScheduledJob(undefined, "resume")
  check("resume: rejects when no job exists", !r.ok)
}

// -- cancel -------------------------------------------------------------
{
  const r = transitionScheduledJob("active", "cancel")
  check("cancel: active → cancelled", r.ok && r.nextStatus === "cancelled")
}
{
  const r = transitionScheduledJob("paused", "cancel")
  check("cancel: paused → cancelled", r.ok && r.nextStatus === "cancelled")
}
{
  const r = transitionScheduledJob("cancelled", "cancel")
  check("cancel: rejects double-cancel", !r.ok)
}
{
  const r = transitionScheduledJob("permanently_failed", "cancel")
  check("cancel: rejects from terminal failed", !r.ok)
}
{
  const r = transitionScheduledJob(undefined, "cancel")
  check("cancel: rejects when no job exists", !r.ok)
}

// -- mark_permanently_failed -------------------------------------------
{
  const r = transitionScheduledJob("active", "mark_permanently_failed")
  check("fail: active → permanently_failed", r.ok && r.nextStatus === "permanently_failed")
}
{
  const r = transitionScheduledJob("paused", "mark_permanently_failed")
  check("fail: paused → permanently_failed", r.ok && r.nextStatus === "permanently_failed")
}
{
  const r = transitionScheduledJob("cancelled", "mark_permanently_failed")
  check("fail: rejects from terminal cancelled", !r.ok)
}

// -- isTerminalStatus ---------------------------------------------------
check("terminal: cancelled is terminal", isTerminalStatus("cancelled"))
check("terminal: permanently_failed is terminal", isTerminalStatus("permanently_failed"))
check("terminal: active is not terminal", !isTerminalStatus("active"))
check("terminal: paused is not terminal", !isTerminalStatus("paused"))
check("terminal: undefined is not terminal", !isTerminalStatus(undefined))

// -- legal round-trip ---------------------------------------------------
// create → pause → resume → cancel
{
  let status: ScheduledJobStatus | undefined = undefined
  const a = transitionScheduledJob(status, "create")
  status = a.nextStatus
  const b = transitionScheduledJob(status, "pause")
  status = b.nextStatus
  const c = transitionScheduledJob(status, "resume")
  status = c.nextStatus
  const d = transitionScheduledJob(status, "cancel")
  check(
    "lifecycle: create → pause → resume → cancel",
    a.ok && b.ok && c.ok && d.ok && d.nextStatus === "cancelled",
  )
}

// ================================================================
// 2-step pipeline trigger logic
// ================================================================

// PDF: "Trigger the pipeline if: reference image provided + AR mismatch
// OR model overrides AR. Skip if alreadyApplied."

// -- no reference image -------------------------------------------------
{
  const r = decideTwoStep(
    { referenceImageUrl: "", targetAspectRatio: "16:9" },
    { modelIgnoresArOnRef: true },
  )
  check("2-step: no ref image → not needed", !r.needed)
}

// -- model respects AR on reference ------------------------------------
{
  const r = decideTwoStep(
    { referenceImageUrl: "u", targetAspectRatio: "16:9", referenceAspectRatio: "1:1" },
    { modelIgnoresArOnRef: false },
  )
  check("2-step: model respects AR → not needed even with mismatch", !r.needed)
}

// -- AR matches ---------------------------------------------------------
{
  const r = decideTwoStep(
    { referenceImageUrl: "u", targetAspectRatio: "16:9", referenceAspectRatio: "16:9" },
    { modelIgnoresArOnRef: true },
  )
  check("2-step: AR matches target → not needed", !r.needed)
}

// -- alreadyApplied short-circuit --------------------------------------
{
  const r = decideTwoStep(
    { referenceImageUrl: "u", targetAspectRatio: "16:9", referenceAspectRatio: "1:1" },
    { modelIgnoresArOnRef: true, alreadyApplied: true },
  )
  check("2-step: alreadyApplied → not needed", !r.needed)
}

// -- AR mismatches + model ignores → TRIGGER ---------------------------
{
  const r = decideTwoStep(
    { referenceImageUrl: "u", targetAspectRatio: "16:9", referenceAspectRatio: "1:1" },
    { modelIgnoresArOnRef: true },
  )
  check("2-step: AR mismatch + override model → needed", r.needed)
}

// -- unknown reference AR + model ignores → conservative TRIGGER -------
// (safe default from studio-two-step.ts: unknown ref AR = apply pipeline)
{
  const r = decideTwoStep(
    { referenceImageUrl: "u", targetAspectRatio: "16:9" },
    { modelIgnoresArOnRef: true },
  )
  check("2-step: unknown ref AR + override model → needed (conservative)", r.needed)
}

// -- step-1 model selection --------------------------------------------
{
  const p = pickStepOneModel({ n: 1, targetAspectRatio: "16:9" })
  check("2-step: n=1, common AR → Poyo nano-banana-2-new-edit", p.provider === "poyo" && p.model === "nano-banana-2-new-edit")
}
{
  const p = pickStepOneModel({ n: 4, targetAspectRatio: "16:9" })
  check("2-step: n>1 → ApiMart gemini preview", p.provider === "apimart" && p.model === "gemini-3.1-flash-image-preview")
}
{
  const p = pickStepOneModel({ n: 1, targetAspectRatio: "1:4" })
  check("2-step: extreme AR → ApiMart gemini preview", p.provider === "apimart" && p.model === "gemini-3.1-flash-image-preview")
}

// -- trigger output shape ---------------------------------------------
{
  const r = decideTwoStep(
    { referenceImageUrl: "u", targetAspectRatio: "16:9", referenceAspectRatio: "1:1", n: 1 },
    { modelIgnoresArOnRef: true },
  )
  if (r.needed) {
    check("2-step: trigger result has model + provider + prompt", !!r.stepOne.model && !!r.stepOne.provider && !!r.stepOne.prompt)
    check("2-step: trigger prompt references target AR", r.stepOne.prompt.includes("16:9"))
  } else {
    check("2-step: expected needed=true", false)
  }
}

console.log(`\n${passed}/${passed + failed} passed`)
if (failed > 0) process.exit(1)
