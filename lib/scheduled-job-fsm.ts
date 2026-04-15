/**
 * Scheduled-job state machine.
 *
 * The actual scheduler that fires Claw jobs lives in the bot repo;
 * this module owns the pure transition contract. Every state change a
 * UI action or backend worker wants to apply should go through
 * transitionScheduledJob — it rejects illegal moves up front so an
 * API route doesn't accidentally un-cancel a cancelled job.
 *
 * Sprint B · Phase 3 · #9 from final_fixes.pdf — "Scheduler job
 * lifecycle (create, pause, resume, cancel)".
 */

export type ScheduledJobStatus = "active" | "paused" | "cancelled" | "permanently_failed"

export type ScheduledJobAction =
  | "create"
  | "pause"
  | "resume"
  | "cancel"
  | "mark_permanently_failed"

export interface TransitionResult {
  ok: boolean
  nextStatus?: ScheduledJobStatus
  error?: string
}

/**
 * Legal state graph:
 *
 *   (none) --create-->   active
 *   active --pause-->    paused
 *   paused --resume-->   active
 *   active --cancel-->   cancelled
 *   paused --cancel-->   cancelled
 *   active --mark_permanently_failed-->          permanently_failed
 *   paused --mark_permanently_failed-->          permanently_failed
 *
 * Terminal states: cancelled, permanently_failed. Nothing escapes them.
 */
export function transitionScheduledJob(
  currentStatus: ScheduledJobStatus | undefined,
  action: ScheduledJobAction,
): TransitionResult {
  if (action === "create") {
    if (currentStatus !== undefined) {
      return { ok: false, error: `Cannot create: job already exists with status ${currentStatus}.` }
    }
    return { ok: true, nextStatus: "active" }
  }

  if (currentStatus === undefined) {
    return { ok: false, error: `Cannot ${action}: job does not exist.` }
  }

  if (currentStatus === "cancelled" || currentStatus === "permanently_failed") {
    return { ok: false, error: `Cannot ${action}: job is in terminal state ${currentStatus}.` }
  }

  switch (action) {
    case "pause":
      if (currentStatus === "paused") return { ok: false, error: "Job is already paused." }
      if (currentStatus === "active") return { ok: true, nextStatus: "paused" }
      return { ok: false, error: `Cannot pause from status ${currentStatus}.` }
    case "resume":
      if (currentStatus === "active") return { ok: false, error: "Job is already active." }
      if (currentStatus === "paused") return { ok: true, nextStatus: "active" }
      return { ok: false, error: `Cannot resume from status ${currentStatus}.` }
    case "cancel":
      return { ok: true, nextStatus: "cancelled" }
    case "mark_permanently_failed":
      return { ok: true, nextStatus: "permanently_failed" }
    default: {
      // Exhaustiveness — if a new action is added, TS will error here.
      const _never: never = action
      return { ok: false, error: `Unknown action: ${String(_never)}` }
    }
  }
}

export function isTerminalStatus(status: ScheduledJobStatus | undefined): boolean {
  return status === "cancelled" || status === "permanently_failed"
}
