import { NextResponse } from "next/server";

import { getAdminAuth } from "@/lib/firebase-admin";
import { upsertPartneroCustomer } from "@/lib/partnero-server";

export const runtime = "nodejs";
export const maxDuration = 15;

type Body = {
  /** Optional partner attribution token (the `?aff=` value or partner key). */
  partnerKey?: string | null;
  /** Display name override; falls back to Firebase decoded name. */
  name?: string | null;
};

/**
 * Server-side replacement for the client-side
 * `po('customers','signup',{key:uid,...})` call.
 *
 * Why server-side: the universal-script call was racing with navigation
 * and silently dropping signups (verified — clicks=2 / signups=0 in
 * Partnero despite multiple real signups). Calling Partnero from our
 * server with the API key is reliable and decouples attribution from
 * client-side timing.
 *
 * Auth gate: Firebase ID token in the Authorization header. We never
 * trust a client-passed uid — extract it from the verified token.
 *
 * Idempotent: Partnero treats `customer.key = uid` as the dedup field.
 * Repeat calls return 422 which we swallow.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let uid: string;
  let email: string | null = null;
  let nameFromToken: string | null = null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email ?? null;
    nameFromToken = (decoded.name as string | undefined) ?? null;
  } catch {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const partnerKey = body.partnerKey?.trim() || null;
  const name = body.name?.trim() || nameFromToken;

  try {
    const created = await upsertPartneroCustomer({
      customerKey: uid,
      email,
      name,
      partnerKey,
    });
    return NextResponse.json({ ok: true, created, attributedTo: partnerKey ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "partnero error";
    // Don't fail the user's auth flow over an attribution problem.
    // Log + return 200 with detail; the customer can still be reconciled
    // server-side later.
    console.warn("[identify] partnero upsert failed:", msg);
    return NextResponse.json({ ok: false, detail: msg }, { status: 200 });
  }
}
