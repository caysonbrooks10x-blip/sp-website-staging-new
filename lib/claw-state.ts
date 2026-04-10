export interface ClawLinkRecord {
  id: string
  channelType: string
  channelUserId: string
  chatId: string
  linkedAt?: string
}

export interface ClawRecentJob {
  id: string
  prompt: string
  status: string
  model?: string
  createdAt?: string
}

export interface ClawScheduledJob {
  jobId: string
  status: "active" | "paused" | "cancelled" | "permanently_failed"
  retryCount: number
  nextRunAt?: string
  skillName?: string
  args?: Record<string, string>
  schedule?: { type: "once" | "interval" | "cron"; at?: string; every?: string; cron?: string; timezone?: string }
  createdAt?: string
  lastRunAt?: string
}

export interface ClawStateResponse {
  link: ClawLinkRecord | null
  recentJobs: ClawRecentJob[]
  scheduledJobs: ClawScheduledJob[]
  creditBalance: number
  generationCount: number
}

export async function fetchClawState(idToken: string): Promise<ClawStateResponse> {
  const response = await fetch("/api/claw/state", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Failed to load Claw state (${response.status})`)
  }

  return (await response.json()) as ClawStateResponse
}
