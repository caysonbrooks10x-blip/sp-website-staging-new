const DEFAULT_TELEGRAM_BOT_URL = "https://t.me/StudioXCbot"
const DEFAULT_SITE_URL = "https://studiox.app"

function normalizeTelegramBotUrl(rawUrl?: string) {
  const fallback = DEFAULT_TELEGRAM_BOT_URL
  const trimmed = rawUrl?.trim()
  if (!trimmed) return fallback

  try {
    const url = new URL(trimmed)
    url.search = ""
    url.hash = ""
    return url.toString().replace(/\/$/, "")
  } catch {
    return fallback
  }
}

export function getTelegramBotUrl() {
  return normalizeTelegramBotUrl(process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL)
}

export function getTelegramBotUsername() {
  const envUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim()
  if (envUsername) {
    return envUsername.startsWith("@") ? envUsername : `@${envUsername}`
  }

  const url = getTelegramBotUrl()
  const slug = url.split("/").filter(Boolean).pop()
  return slug ? `@${slug}` : "@StudioXCbot"
}

export function buildTelegramBotStartUrl(start?: string) {
  const baseUrl = getTelegramBotUrl()
  if (!start) return baseUrl

  const url = new URL(baseUrl)
  url.searchParams.set("start", start)
  return url.toString()
}

export function getPublicSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL
}
