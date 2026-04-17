import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

interface FirestoreRunQueryRow {
  document?: {
    name?: string;
    fields?: Record<string, FirestoreValue>;
  };
}

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ||
  process.env.FIREBASE_WEB_API_KEY?.trim() ||
  "";
const FIREBASE_PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() || "";
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() || "";
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n") || "";

const CLAW_BOT_URL = process.env.CLAW_BOT_URL?.trim() || "https://bot-staging.saipro-x.com";
const CLAW_BOT_SECRET = process.env.CLAW_BOT_SECRET?.trim() || "";

const FIRESTORE_DOCS_BASE = FIREBASE_PROJECT_ID
  ? `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`
  : "";

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!FIREBASE_API_KEY || !FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    return NextResponse.json({ error: "Server misconfigured (firebase)" }, { status: 500 });
  }
  if (!CLAW_BOT_SECRET) {
    return NextResponse.json({ error: "Server misconfigured (CLAW_BOT_SECRET missing)" }, { status: 500 });
  }

  const body = await request.json().catch(() => null) as
    | { assetUrl?: string; mediaType?: "image" | "video"; caption?: string }
    | null;
  if (!body?.assetUrl || !body.mediaType) {
    return NextResponse.json({ error: "assetUrl and mediaType required" }, { status: 400 });
  }
  if (body.mediaType !== "image" && body.mediaType !== "video") {
    return NextResponse.json({ error: "mediaType must be image or video" }, { status: 400 });
  }

  const idToken = authHeader.slice(7);
  const firebaseUID = await verifyFirebaseIdToken(idToken);
  if (!firebaseUID) {
    return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
  }

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Failed to obtain Firestore access" }, { status: 500 });
  }

  const rows = await runQuery(accessToken, {
    from: [{ collectionId: "claw_user_links" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "firebaseUID" },
        op: "EQUAL",
        value: { stringValue: firebaseUID },
      },
    },
    limit: 1,
  });

  const chatId = rows[0]?.document?.fields?.chatId?.stringValue || "";
  if (!chatId) {
    return NextResponse.json({ error: "NOT_LINKED" }, { status: 409 });
  }

  const botRes = await fetch(`${CLAW_BOT_URL}/internal/send-asset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Claw-Secret": CLAW_BOT_SECRET,
    },
    body: JSON.stringify({
      chatId,
      assetUrl: body.assetUrl,
      mediaType: body.mediaType,
      caption: body.caption || "",
    }),
  }).catch((e) => {
    console.error("[send-asset] bot fetch error", e);
    return null;
  });

  if (!botRes || !botRes.ok) {
    const txt = botRes ? await botRes.text().catch(() => "") : "network";
    return NextResponse.json({ error: "Bot delivery failed", detail: txt }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

async function runQuery(accessToken: string, structuredQuery: Record<string, unknown>): Promise<FirestoreRunQueryRow[]> {
  const res = await fetch(`${FIRESTORE_DOCS_BASE}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ structuredQuery }),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as FirestoreRunQueryRow[];
  return rows.filter((r) => Boolean(r.document));
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
  const data = (await res.json()) as { users?: Array<{ localId?: string }> };
  return data.users?.[0]?.localId ?? null;
}

async function getGoogleAccessToken(): Promise<string | null> {
  if (cachedAccessToken && cachedAccessToken.expiresAtMs > Date.now()) return cachedAccessToken.token;
  const jwt = await createSignedJwt();
  if (!jwt) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  const ttlMs = Math.max(30, (data.expires_in ?? 3600) - 60) * 1000;
  cachedAccessToken = { token: data.access_token, expiresAtMs: Date.now() + ttlMs };
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
    const unsigned = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`;
    const key = await crypto.subtle.importKey(
      "pkcs8",
      pemToBytes(FIREBASE_PRIVATE_KEY) as unknown as BufferSource,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
    return `${unsigned}.${b64uBytes(new Uint8Array(sig))}`;
  } catch {
    return null;
  }
}

function pemToBytes(pem: string): Uint8Array {
  const normalized = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const bin = atob(normalized);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64u(v: string): string {
  return b64uBytes(new TextEncoder().encode(v));
}

function b64uBytes(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
