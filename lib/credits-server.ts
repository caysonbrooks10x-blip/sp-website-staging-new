import { getModelCredits, type CreditConfigInput } from "@/lib/model-credits"

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ||
  process.env.FIREBASE_WEB_API_KEY?.trim() ||
  ""
const FIREBASE_PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() || ""
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() || ""
const FIREBASE_PRIVATE_KEY =
  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n") || ""

const FIRESTORE_BASE = FIREBASE_PROJECT_ID
  ? `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)`
  : ""

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null

export class InsufficientTokensError extends Error {
  code = "INSUFFICIENT_TOKENS"
  required: number
  balance: number
  constructor(required: number, balance: number) {
    super(`Insufficient tokens: requires ${required}, balance ${balance}`)
    this.required = required
    this.balance = balance
  }
}

export class CreditsAuthError extends Error {
  code = "UNAUTHORIZED"
}

export class CreditsConfigError extends Error {
  code = "SERVER_MISCONFIGURED"
}

function base64UrlEncodeString(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function pemToUint8Array(pem: string): Uint8Array {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")
  return new Uint8Array(Buffer.from(b64, "base64"))
}

async function verifyFirebaseIdToken(idToken: string): Promise<string | null> {
  if (!FIREBASE_API_KEY) return null
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  )
  if (!res.ok) return null
  const data = (await res.json()) as { users?: Array<{ localId?: string }> }
  return data.users?.[0]?.localId ?? null
}

async function createSignedJwt(): Promise<string | null> {
  try {
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: "RS256", typ: "JWT" }
    const payload = {
      iss: FIREBASE_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }
    const unsigned = `${base64UrlEncodeString(JSON.stringify(header))}.${base64UrlEncodeString(JSON.stringify(payload))}`
    const key = await crypto.subtle.importKey(
      "pkcs8",
      pemToUint8Array(FIREBASE_PRIVATE_KEY) as unknown as BufferSource,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    )
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(unsigned),
    )
    const sigB64 = Buffer.from(new Uint8Array(signature))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "")
    return `${unsigned}.${sigB64}`
  } catch {
    return null
  }
}

async function getGoogleAccessToken(): Promise<string | null> {
  if (cachedAccessToken && cachedAccessToken.expiresAtMs > Date.now()) {
    return cachedAccessToken.token
  }
  const jwt = await createSignedJwt()
  if (!jwt) return null
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) return null
  const ttlMs = Math.max(30, (data.expires_in ?? 3600) - 60) * 1000
  cachedAccessToken = { token: data.access_token, expiresAtMs: Date.now() + ttlMs }
  return data.access_token
}

function assertConfig(): void {
  if (!FIREBASE_API_KEY || !FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new CreditsConfigError("Missing Firebase admin credentials for credit deduction")
  }
}

function readNumberField(field: unknown): number {
  if (!field || typeof field !== "object") return 0
  const f = field as Record<string, unknown>
  if (typeof f.integerValue === "string") return Number(f.integerValue)
  if (typeof f.integerValue === "number") return f.integerValue
  if (typeof f.doubleValue === "number") return f.doubleValue
  return 0
}

async function applyBalanceDelta(
  uid: string,
  accessToken: string,
  deltaCredits: number,
  opts: { requireBalance?: number } = {},
): Promise<{ newBalance: number }> {
  const docPath = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`

  for (let attempt = 0; attempt < 4; attempt++) {
    const getRes = await fetch(
      `${FIRESTORE_BASE}/documents/users/${uid}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!getRes.ok) throw new Error(`Failed to read user doc: ${getRes.status}`)
    const userDoc = (await getRes.json()) as {
      fields?: Record<string, unknown>
      updateTime?: string
    }
    const currentBalance = readNumberField(userDoc.fields?.tokenBalance)
    const required = opts.requireBalance ?? 0
    if (required > 0 && currentBalance < required) {
      throw new InsufficientTokensError(required, currentBalance)
    }
    const nextBalance = currentBalance + deltaCredits
    const updateTime = userDoc.updateTime

    const commitBody: Record<string, unknown> = {
      writes: [
        {
          update: {
            name: docPath,
            fields: { tokenBalance: { integerValue: String(nextBalance) } },
          },
          updateMask: { fieldPaths: ["tokenBalance"] },
          ...(updateTime
            ? { currentDocument: { updateTime } }
            : { currentDocument: { exists: true } }),
        },
      ],
    }

    const commitRes = await fetch(`${FIRESTORE_BASE}/documents:commit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commitBody),
    })
    if (commitRes.ok) {
      return { newBalance: nextBalance }
    }
    // Retry on precondition failed (concurrent write) — up to 4 tries total.
    if (commitRes.status === 400 || commitRes.status === 409 || commitRes.status === 412) {
      continue
    }
    const text = await commitRes.text().catch(() => "")
    throw new Error(`Failed to commit balance change: ${commitRes.status} ${text}`)
  }
  throw new Error("Failed to commit balance change after retries")
}

export interface ChargeResult {
  uid: string
  charged: number
  newBalance: number
}

/**
 * Verify the caller's Firebase ID token, compute credits for the requested
 * generation, and atomically deduct them from users/{uid}.tokenBalance.
 *
 * Throws:
 *   - CreditsAuthError (401) if the token is missing/invalid
 *   - CreditsConfigError (500) if Firebase admin env vars are missing
 *   - InsufficientTokensError (402) if the user can't afford the job
 */
export async function chargeUserForSubmit(params: {
  authHeader: string | null
  model: string
  config?: CreditConfigInput
}): Promise<ChargeResult> {
  const { authHeader, model, config } = params
  if (!authHeader?.startsWith("Bearer ")) {
    throw new CreditsAuthError("Missing bearer token")
  }
  assertConfig()
  const idToken = authHeader.slice(7)
  const uid = await verifyFirebaseIdToken(idToken)
  if (!uid) throw new CreditsAuthError("Invalid Firebase ID token")

  const charge = getModelCredits(model, config ?? {})
  if (charge <= 0) {
    // Unknown/zero-cost model — skip charging. Validator elsewhere decides
    // whether the model is actually allowed.
    return { uid, charged: 0, newBalance: 0 }
  }
  const accessToken = await getGoogleAccessToken()
  if (!accessToken) throw new CreditsConfigError("Failed to mint Google access token")

  const { newBalance } = await applyBalanceDelta(uid, accessToken, -charge, {
    requireBalance: charge,
  })
  return { uid, charged: charge, newBalance }
}

/**
 * Refund credits previously charged by chargeUserForSubmit. Best-effort:
 * logs and swallows errors so refund failures never mask the original error.
 */
export async function refundCredits(uid: string, credits: number): Promise<void> {
  if (credits <= 0) return
  try {
    assertConfig()
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) return
    await applyBalanceDelta(uid, accessToken, credits)
  } catch (err) {
    console.error("[credits-server] refund failed", { uid, credits, err })
  }
}

export function buildConfigFromPayload(payload: Record<string, unknown>): CreditConfigInput {
  return {
    resolution: typeof payload.resolution === "string" ? payload.resolution : undefined,
    duration:
      typeof payload.duration === "number" || typeof payload.duration === "string"
        ? (payload.duration as number | string)
        : undefined,
    n: typeof payload.n === "number" ? payload.n : undefined,
    aspect_ratio: typeof payload.aspect_ratio === "string" ? payload.aspect_ratio : undefined,
  }
}
