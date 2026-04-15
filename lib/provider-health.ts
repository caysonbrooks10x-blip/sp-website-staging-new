import type { StudioProvider } from "@/lib/provider-routing"

export type ProviderHealthStatus = "healthy" | "degraded" | "down" | "unknown"
export type ProviderHealthSignal = "live" | "session" | "blended"

export interface ProviderHealthSnapshot {
  provider: StudioProvider
  status: ProviderHealthStatus
  signal: ProviderHealthSignal
  message?: string
  latencyMs?: number
  lastCheckedAt?: number
  lastSuccessAt?: number
  lastFailureAt?: number
  successCount?: number
  failureCount?: number
  remainingBalance?: number
}

interface SessionProviderTelemetry {
  provider: StudioProvider
  successCount: number
  failureCount: number
  consecutiveFailures: number
  lastSuccessAt?: number
  lastFailureAt?: number
  lastQueuedAt?: number
  lastMessage?: string
  lastLatencyMs?: number
}

export interface ProviderTelemetryEvent {
  provider: StudioProvider
  outcome: "queued" | "success" | "failure" | "fallback"
  message?: string
  latencyMs?: number
}

const LOCAL_KEY = "studio_provider_telemetry_v1"

function readSessionTelemetryMap(): Record<string, SessionProviderTelemetry> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function writeSessionTelemetryMap(value: Record<string, SessionProviderTelemetry>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(value))
}

export function recordProviderTelemetryEvent(event: ProviderTelemetryEvent) {
  if (typeof window === "undefined") return

  const telemetry = readSessionTelemetryMap()
  const current = telemetry[event.provider] || {
    provider: event.provider,
    successCount: 0,
    failureCount: 0,
    consecutiveFailures: 0,
  }
  const now = Date.now()

  if (event.outcome === "queued") {
    current.lastQueuedAt = now
  }

  if (event.outcome === "success") {
    current.successCount += 1
    current.consecutiveFailures = 0
    current.lastSuccessAt = now
  }

  if (event.outcome === "failure") {
    current.failureCount += 1
    current.consecutiveFailures += 1
    current.lastFailureAt = now
    current.lastMessage = event.message
  }

  if (event.outcome === "fallback") {
    current.lastFailureAt = now
    current.lastMessage = event.message || "Fallback route engaged."
  }

  if (typeof event.latencyMs === "number") {
    current.lastLatencyMs = event.latencyMs
  }

  telemetry[event.provider] = current
  writeSessionTelemetryMap(telemetry)
}

export function getSessionProviderHealth(provider: StudioProvider): ProviderHealthSnapshot | null {
  const telemetry = readSessionTelemetryMap()[provider]
  if (!telemetry) return null

  const now = Date.now()
  const recentFailure = telemetry.lastFailureAt && now - telemetry.lastFailureAt < 10 * 60 * 1000
  const recentSuccess = telemetry.lastSuccessAt && now - telemetry.lastSuccessAt < 30 * 60 * 1000

  let status: ProviderHealthStatus = "unknown"
  if (telemetry.consecutiveFailures >= 3) status = "down"
  else if (recentFailure && telemetry.failureCount >= Math.max(2, telemetry.successCount)) status = "degraded"
  else if (recentSuccess) status = "healthy"

  return {
    provider,
    status,
    signal: "session",
    message: telemetry.lastMessage,
    latencyMs: telemetry.lastLatencyMs,
    lastSuccessAt: telemetry.lastSuccessAt,
    lastFailureAt: telemetry.lastFailureAt,
    successCount: telemetry.successCount,
    failureCount: telemetry.failureCount,
    lastCheckedAt: telemetry.lastQueuedAt || telemetry.lastSuccessAt || telemetry.lastFailureAt,
  }
}

export function mergeProviderHealth(
  live: ProviderHealthSnapshot | null | undefined,
  session: ProviderHealthSnapshot | null | undefined
): ProviderHealthSnapshot | null {
  if (!live && !session) return null
  if (!live) return session || null
  if (!session) return live

  const status: ProviderHealthStatus =
    live.status === "down" || session.status === "down"
      ? "down"
      : live.status === "degraded" || session.status === "degraded"
        ? "degraded"
        : live.status === "healthy" || session.status === "healthy"
          ? "healthy"
          : "unknown"

  return {
    provider: live.provider,
    status,
    signal: "blended",
    message: live.message || session.message,
    latencyMs: live.latencyMs ?? session.latencyMs,
    remainingBalance: live.remainingBalance,
    lastCheckedAt: Math.max(live.lastCheckedAt || 0, session.lastCheckedAt || 0) || undefined,
    lastSuccessAt: Math.max(live.lastSuccessAt || 0, session.lastSuccessAt || 0) || undefined,
    lastFailureAt: Math.max(live.lastFailureAt || 0, session.lastFailureAt || 0) || undefined,
    successCount: (live.successCount || 0) + (session.successCount || 0) || undefined,
    failureCount: (live.failureCount || 0) + (session.failureCount || 0) || undefined,
  }
}
