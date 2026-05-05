"use client"

import { useEffect } from "react"
import { useAuth } from "@/context/auth-context"

const PARTNERO_IDENTIFIED_KEY = "px_partnero_identified_uid"

/**
 * Cookie names Partnero's universal.js may use for the partner attribution
 * token after a `?aff=...` URL visit. Different versions of the script
 * have used different names — read all known variants and pick the first
 * non-empty one.
 */
const PARTNERO_COOKIE_NAMES = [
  "_partnero_partner",
  "partnero_partner",
  "_partnero_referral",
  "partnero_referral",
  "_partnero_ref",
  "partnero_ref",
  "_po_partner",
]

function readPartneroCookie(): string | null {
  if (typeof document === "undefined") return null
  const all = document.cookie.split(";").map((c) => c.trim())
  for (const name of PARTNERO_COOKIE_NAMES) {
    const hit = all.find((c) => c.startsWith(name + "="))
    if (hit) {
      const v = decodeURIComponent(hit.slice(name.length + 1))
      if (v) return v
    }
  }
  return null
}

/**
 * Identifies the logged-in StudioX user with Partnero so partner
 * referrals and conversions attribute to the right person.
 *
 * Switched 2026-05-05 from the client-side
 * `po('customers','signup',{data:{...}})` universal-script call to a
 * server-side POST /api/auth/identify call. Reason: live testing showed
 * the universal-script call was unreliable — Partnero recorded clicks
 * but signups silently dropped (verified clicks=2 vs signups=0 across
 * multiple real signups). The server-side path uses the Partnero API
 * key directly and never races with navigation.
 *
 * Performance contract:
 *  - Fires AT MOST ONCE per browser session per uid (sessionStorage gate).
 *  - requestIdleCallback wrap so it never competes with first interaction.
 *  - Reads the partner attribution cookie set by Partnero's universal
 *    script when the user visited `?aff=...`. Passes that cookie value
 *    to our server so attribution survives all the way through.
 *  - On failure, leaves the sessionStorage gate UNSET so the next page
 *    load tries again — no permanent silent loss.
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
      // sessionStorage may be unavailable (private mode); fall through.
    }
    if (alreadyIdentified) return

    const fire = async () => {
      try {
        const idToken = await user.getIdToken()
        const partnerKey = readPartneroCookie()
        const res = await fetch("/api/auth/identify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          credentials: "same-origin",
          body: JSON.stringify({
            partnerKey,
            name: user.displayName,
          }),
        })
        if (res.ok) {
          try {
            sessionStorage.setItem(PARTNERO_IDENTIFIED_KEY, user.uid)
          } catch {
            // ignored
          }
        } else {
          console.warn("[partnero-identify] non-ok:", res.status)
        }
      } catch (err) {
        console.warn("[partnero-identify] failed:", err)
      }
    }

    const ric: ((cb: () => void) => unknown) | undefined =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => unknown }).requestIdleCallback
    if (typeof ric === "function") {
      ric(() => void fire())
    } else {
      // Safari etc. — generous setTimeout so we don't compete with first interaction.
      setTimeout(() => void fire(), 1500)
    }
  }, [user])

  return null
}
