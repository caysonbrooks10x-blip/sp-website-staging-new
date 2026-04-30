"use client"

import { useEffect } from "react"
import { useAuth } from "@/context/auth-context"

declare global {
  interface Window {
    po?: (...args: unknown[]) => unknown
  }
}

const PARTNERO_IDENTIFIED_KEY = "px_partnero_identified_uid"

/**
 * Identifies the logged-in StudioX user with Partnero so partner referrals
 * and conversions attribute to the right person.
 *
 * Performance contract:
 *  - Fires AT MOST ONCE per browser session per uid (gated by sessionStorage).
 *    Without this gate, every full-page navigation re-mounts the component
 *    and re-fires the call — the perf audit measured 1.4–2.2s blocking on
 *    `customers` POST on /pricing, /profile, /creations, /community.
 *  - Wraps the call in requestIdleCallback so it never competes with
 *    interactive work on the main thread.
 *  - No-op on the server. Silent if the Partnero script hasn't loaded yet
 *    (the universal script self-defers; sessionStorage gate prevents retry
 *    storms on every render).
 */
export function PartneroIdentify() {
  const { user } = useAuth()

  useEffect(() => {
    if (typeof window === "undefined" || !user) return

    // Don't re-identify the same uid this session.
    let alreadyIdentified = false
    try {
      alreadyIdentified = sessionStorage.getItem(PARTNERO_IDENTIFIED_KEY) === user.uid
    } catch {
      // sessionStorage may be unavailable (private mode); fall through
      // and accept the per-navigation re-fire as the safe degraded path.
    }
    if (alreadyIdentified) return

    const fire = () => {
      if (typeof window.po !== "function") return
      try {
        window.po("customers", "signup", {
          data: {
            key: user.uid,
            email: user.email || undefined,
            name: user.displayName || undefined,
          },
        })
        try {
          sessionStorage.setItem(PARTNERO_IDENTIFIED_KEY, user.uid)
        } catch {
          // ignored — see comment above
        }
      } catch (err) {
        console.warn("[partnero] identify failed:", err)
      }
    }

    const ric: ((cb: () => void) => unknown) | undefined =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => unknown }).requestIdleCallback
    if (typeof ric === "function") {
      ric(fire)
    } else {
      // Safari etc. — fall back to a generous setTimeout so we don't compete
      // with first interaction.
      setTimeout(fire, 1500)
    }
  }, [user])

  return null
}
