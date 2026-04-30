"use client"

import { useEffect } from "react"
import { useAuth } from "@/context/auth-context"

declare global {
  interface Window {
    po?: (...args: unknown[]) => unknown
  }
}

/**
 * Identifies the logged-in StudioX user with Partnero so partner referrals
 * and conversions attribute to the right person. Runs on every auth change
 * — Partnero's `customers` action is idempotent on the same key.
 *
 * No-op on the server. Silent if the Partnero script hasn't loaded yet
 * (the universal script in app/layout.tsx self-defers, so this just retries
 * on the next render).
 */
export function PartneroIdentify() {
  const { user } = useAuth()

  useEffect(() => {
    if (typeof window === "undefined" || !user) return
    if (typeof window.po !== "function") return

    try {
      window.po("customers", "signup", {
        data: {
          key: user.uid,
          email: user.email || undefined,
          name: user.displayName || undefined,
        },
      })
    } catch (err) {
      console.warn("[partnero] identify failed:", err)
    }
  }, [user])

  return null
}
