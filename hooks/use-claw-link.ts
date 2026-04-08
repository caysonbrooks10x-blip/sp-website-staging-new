"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/auth-context"
import { fetchClawState, type ClawLinkRecord } from "@/lib/claw-state"

export function useClawLink() {
  const { user } = useAuth()
  const [link, setLink] = useState<ClawLinkRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    if (!user) {
      setLink(null)
      setLoading(false)
      return
    }

    setLoading(true)

    const loadData = () => {
      user
        .getIdToken()
        .then((idToken) => fetchClawState(idToken))
        .then((state) => {
          if (cancelled) return
          setLink(state.link)
          setLoading(false)
        })
        .catch(() => {
          if (cancelled) return
          if (loading) setLoading(false)
        })
    }

    loadData()
    const intervalId = setInterval(loadData, 4000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [user])

  return {
    link,
    isLinked: Boolean(link),
    loading,
  }
}
