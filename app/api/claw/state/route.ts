import { NextResponse } from "next/server";

import type { ClawRecentJob, ClawScheduledJob } from "@/lib/claw-state";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface AccountsLookupResponse {
  users?: Array<{ localId?: string }>;
}

interface FirestoreRunQueryRow {
  document?: {
    name?: string;
    fields?: Record<string, FirestoreValue>;
  };
}

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  booleanValue?: boolean;
  mapValue?: { fields?: Record<string, FirestoreValue> };
  arrayValue?: { values?: FirestoreValue[] };
  nullValue?: null;
}

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ||
  process.env.FIREBASE_WEB_API_KEY?.trim() ||
  "";
const FIREBASE_PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() || "";
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() || "";
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n") || "";

const FIRESTORE_DOCS_BASE = FIREBASE_PROJECT_ID
  ? `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`
  : "";

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!FIREBASE_API_KEY || !FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    return NextResponse.json(
      { error: "Server misconfigured. Missing Firebase credentials for Claw state." },
      { status: 500 }
    );
  }

  const idToken = authHeader.slice(7);
  const firebaseUID = await verifyFirebaseIdToken(idToken);
  if (!firebaseUID) {
    return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
  }

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Failed to initialize Firebase access token" }, { status: 500 });
  }

  const [linkRows, scheduleRows, jobRows] = await Promise.all([
    runQuery("claw_user_links", accessToken, {
      from: [{ collectionId: "claw_user_links" }],
      where: fieldFilter("firebaseUID", "EQUAL", { stringValue: firebaseUID }),
      limit: 1,
    }),
    runQuery("claw_scheduled_jobs", accessToken, {
      from: [{ collectionId: "claw_scheduled_jobs" }],
      where: fieldFilter("firebaseUID", "EQUAL", { stringValue: firebaseUID }),
      limit: 50,
    }),
    runQuery("jobs", accessToken, {
      from: [{ collectionId: "jobs" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            fieldFilter("userId", "EQUAL", { stringValue: firebaseUID }),
            fieldFilter("source", "EQUAL", { stringValue: "claw" }),
          ],
        },
      },
      limit: 24,
    }),
  ]);

  // Fetch credit balance and generation count in parallel
  const [userDocRes, memoryDocRes] = await Promise.all([
    fetch(`${FIRESTORE_DOCS_BASE}/users/${firebaseUID}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => null),
    fetch(`${FIRESTORE_DOCS_BASE}/claw_memory/${firebaseUID}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => null),
  ]);

  let creditBalance = 0;
  let generationCount = 0;

  if (userDocRes?.ok) {
    const userDoc = (await userDocRes.json()) as { fields?: Record<string, FirestoreValue> };
    creditBalance = readNumber(userDoc.fields?.tokenBalance);
  }

  if (memoryDocRes?.ok) {
    const memoryDoc = (await memoryDocRes.json()) as { fields?: Record<string, FirestoreValue> };
    generationCount = readNumber(memoryDoc.fields?.generationCount);
  }

  const linkRow = linkRows[0];
  const linkFields = linkRow?.document?.fields ?? null;

  const link = linkFields
    ? {
        id: getDocumentId(linkRow?.document?.name),
        channelType: readString(linkFields.channelType) || "telegram",
        channelUserId: readString(linkFields.channelUserId) || "",
        chatId: readString(linkFields.chatId) || "",
        linkedAt: readString(linkFields.linkedAt) || undefined,
      }
    : null;

  const scheduledJobs = scheduleRows
    .map((row) => {
      const fields = row.document?.fields;
      if (!fields) return null;

      const status = readString(fields.status) as ClawScheduledJob["status"];
      if (!["active", "paused", "cancelled", "permanently_failed"].includes(status)) {
        return null;
      }

      return {
        jobId: getDocumentId(row.document?.name),
        status,
        retryCount: readNumber(fields.retryCount),
        nextRunAt: readString(fields.nextRunAt) || undefined,
        skillName: readString(fields.skillName) || undefined,
        args: readMap(fields.args) as Record<string, string> | undefined,
        schedule: readMap(fields.schedule) as ClawScheduledJob["schedule"] | undefined,
        createdAt: readString(fields.createdAt) || undefined,
        lastRunAt: readString(fields.lastRunAt) || undefined,
      } satisfies ClawScheduledJob;
    })
    .filter(isDefined)
    .sort((a, b) => {
      const aTime = a.nextRunAt ? Date.parse(a.nextRunAt) : Number.POSITIVE_INFINITY;
      const bTime = b.nextRunAt ? Date.parse(b.nextRunAt) : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });

  const recentJobs = jobRows
    .map((row) => {
      const fields = row.document?.fields;
      if (!fields) return null;

      return {
        id: getDocumentId(row.document?.name),
        prompt: readString(fields.prompt) || readMap(fields.args)?.prompt || "Untitled request",
        status: readString(fields.status) || "pending",
        model: readString(fields.model) || readMap(fields.args)?.model || undefined,
        createdAt: readString(fields.createdAt) || readTimestamp(fields.createdAt) || undefined,
      } satisfies ClawRecentJob;
    })
    .filter(isDefined)
    .sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bTime - aTime;
    })
    .slice(0, 6);

  return NextResponse.json({
    link,
    scheduledJobs,
    recentJobs,
    creditBalance,
    generationCount,
  });
}

async function runQuery(
  collectionId: string,
  accessToken: string,
  structuredQuery: Record<string, unknown>
): Promise<FirestoreRunQueryRow[]> {
  const response = await fetch(`${FIRESTORE_DOCS_BASE}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ structuredQuery }),
  });

  if (!response.ok) {
    return [];
  }

  const rows = (await response.json()) as FirestoreRunQueryRow[];
  return rows.filter((row) => Boolean(row.document));
}

function fieldFilter(field: string, op: string, value: FirestoreValue) {
  return {
    fieldFilter: {
      field: { fieldPath: field },
      op,
      value,
    },
  };
}

function getDocumentId(name?: string) {
  if (!name) return "";
  const parts = name.split("/");
  return parts[parts.length - 1] || "";
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}

function readString(value?: FirestoreValue) {
  return value?.stringValue ?? "";
}

function readTimestamp(value?: FirestoreValue) {
  return value?.timestampValue ?? "";
}

function readNumber(value?: FirestoreValue) {
  if (!value) return 0;
  if (typeof value.integerValue === "string") return Number(value.integerValue || 0);
  if (typeof value.doubleValue === "number") return value.doubleValue;
  return 0;
}

function readMap(value?: FirestoreValue): Record<string, any> | null {
  const fields = value?.mapValue?.fields;
  if (!fields) return null;

  const output: Record<string, any> = {};
  for (const [key, child] of Object.entries(fields)) {
    output[key] = decodeFirestoreValue(child);
  }
  return output;
}

function decodeFirestoreValue(value?: FirestoreValue): any {
  if (!value) return null;
  if (typeof value.stringValue === "string") return value.stringValue;
  if (typeof value.integerValue === "string") return Number(value.integerValue || 0);
  if (typeof value.doubleValue === "number") return value.doubleValue;
  if (typeof value.booleanValue === "boolean") return value.booleanValue;
  if (typeof value.timestampValue === "string") return value.timestampValue;
  if (value.arrayValue?.values) return value.arrayValue.values.map((item) => decodeFirestoreValue(item));
  if (value.mapValue?.fields) return readMap(value);
  return null;
}

async function verifyFirebaseIdToken(idToken: string): Promise<string | null> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!res.ok) return null;
  const data = (await res.json()) as AccountsLookupResponse;
  return data.users?.[0]?.localId ?? null;
}

async function getGoogleAccessToken(): Promise<string | null> {
  if (cachedAccessToken && cachedAccessToken.expiresAtMs > Date.now()) {
    return cachedAccessToken.token;
  }

  const jwt = await createSignedJwt();
  if (!jwt) return null;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;

  const ttlMs = Math.max(30, (data.expires_in ?? 3600) - 60) * 1000;
  cachedAccessToken = {
    token: data.access_token,
    expiresAtMs: Date.now() + ttlMs,
  };
  return data.access_token;
}

async function createSignedJwt(): Promise<string | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
      iss: FIREBASE_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    };

    const unsignedToken = `${base64UrlEncodeString(JSON.stringify(header))}.${base64UrlEncodeString(
      JSON.stringify(payload)
    )}`;

    const key = await crypto.subtle.importKey(
      "pkcs8",
      pemToUint8Array(FIREBASE_PRIVATE_KEY) as unknown as BufferSource,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(unsignedToken)
    );

    return `${unsignedToken}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;
  } catch {
    return null;
  }
}

function pemToUint8Array(pem: string): Uint8Array {
  const normalized = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");

  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlEncodeString(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
// Force Next.js HMR
