import { NextResponse } from "next/server";

export const runtime = "edge";

interface ApproveBody {
  code?: string;
}

interface AccountsLookupResponse {
  users?: Array<{ localId?: string }>;
}

interface FirestoreDocument {
  name?: string;
  fields?: Record<string, unknown>;
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
const FIRESTORE_COMMIT_URL = FIREBASE_PROJECT_ID
  ? `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`
  : "";

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!FIREBASE_API_KEY || !FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    return NextResponse.json(
      { error: "Server misconfigured. Missing Firebase Admin credentials for edge runtime." },
      { status: 500 }
    );
  }

  const token = authHeader.slice(7);
  const firebaseUID = await verifyFirebaseIdToken(token);
  if (!firebaseUID) {
    return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
  }

  let body: ApproveBody;
  try {
    body = (await request.json()) as ApproveBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  if (!code || code.length !== 6) {
    return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
  }

  let accessToken: string | null = null;
  try {
    accessToken = await getGoogleAccessToken();
  } catch (err: any) {
    return NextResponse.json({ error: `Auth Error: ${err.message}` }, { status: 500 });
  }

  if (!accessToken) {
    return NextResponse.json({ error: "Failed to initialize Firebase access token (null token)" }, { status: 500 });
  }

    const pairingRes = await fetch(`${FIRESTORE_DOCS_BASE}/claw_pairings/${code}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

  if (pairingRes.status === 404) {
    return NextResponse.json({ error: "Code not found. Generate a new one with /pair." }, { status: 404 });
  }
  if (!pairingRes.ok) {
    return NextResponse.json({ error: "Failed to read pairing record" }, { status: 500 });
  }

  const pairingDoc = (await pairingRes.json()) as FirestoreDocument;
  const pairingFields = pairingDoc.fields ?? {};

  const expiresAt = getStringField(pairingFields, "expiresAt");
  const status = getStringField(pairingFields, "status");
  const channelType = getStringField(pairingFields, "channelType");
  const channelUserId = getStringField(pairingFields, "channelUserId");
  const chatId = getStringField(pairingFields, "chatId");

  if (!expiresAt || Number.isNaN(Date.parse(expiresAt)) || new Date(expiresAt) < new Date()) {
    return NextResponse.json({ error: "Code has expired. Generate a new one with /pair." }, { status: 410 });
  }

  if (status === "approved") {
    return NextResponse.json({ error: "Code already used." }, { status: 409 });
  }

  if (!channelType || !channelUserId || !chatId) {
    return NextResponse.json({ error: "Pairing record is incomplete." }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  const pairingDocName = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/claw_pairings/${code}`;
  const linkId = `${channelType}:${channelUserId}`;
  const linkDocName = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/claw_user_links/${linkId}`;

  const commitPayload = {
    writes: [
      {
        update: {
          name: pairingDocName,
          fields: {
            ...pairingFields,
            status: { stringValue: "approved" },
            approvedAt: { stringValue: nowIso },
            approvedBy: { stringValue: firebaseUID },
          },
        },
      },
      {
        update: {
          name: linkDocName,
          fields: {
            firebaseUID: { stringValue: firebaseUID },
            channelType: { stringValue: channelType },
            channelUserId: { stringValue: channelUserId },
            chatId: { stringValue: chatId },
            linkedAt: { stringValue: nowIso },
          },
        },
      },
    ],
  };

  const commitRes = await fetch(FIRESTORE_COMMIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commitPayload),
  });

  if (!commitRes.ok) {
    const errText = await commitRes.text();
    return NextResponse.json({ error: `Failed to save pairing link: ${errText}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    channelType,
    channelUserId,
    chatId,
    telegramUrl: channelType === "telegram" ? "https://t.me/StudioXCbot" : undefined,
    message: "Account linked successfully",
  });
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
  if (!jwt) throw new Error("createSignedJwt returned null");

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OAuth fetch failed: ${res.status} ${errorText}`);
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("No access_token in OAuth response");

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
  } catch (err: any) {
    throw new Error(`JWT Signing Error: ${err.message}`);
  }
}

function getStringField(fields: Record<string, unknown>, key: string): string {
  const entry = fields[key] as { stringValue?: string } | undefined;
  return entry?.stringValue ?? "";
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
  const bytes = new TextEncoder().encode(value);
  return base64UrlEncodeBytes(bytes);
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
// Force Next.js Edge re-compile to load Live Keys
