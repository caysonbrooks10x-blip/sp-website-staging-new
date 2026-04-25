import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type FinalizeBody = {
  taskId?: string;
  sourceUrl?: string;
  provider?: string;
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as FinalizeBody | null;
  const sourceUrl = body?.sourceUrl;
  const taskId = body?.taskId;
  const provider = body?.provider || "poyo";

  if (!sourceUrl || !taskId) {
    return NextResponse.json(
      { error: "sourceUrl and taskId required" },
      { status: 400 },
    );
  }
  if (!/^https:\/\//.test(sourceUrl)) {
    return NextResponse.json({ error: "https url required" }, { status: 400 });
  }

  const remuxBase = process.env.VIDEO_REMUX_URL;
  const remuxSecret = process.env.VIDEO_REMUX_SECRET;

  if (!remuxBase || !remuxSecret) {
    console.warn("[finalize] remux service not configured; returning source URL");
    return NextResponse.json({ url: sourceUrl, fallback: true, reason: "remux_disabled" });
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 45_000);
  try {
    const resp = await fetch(`${remuxBase}/internal/video/faststart`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": remuxSecret,
      },
      body: JSON.stringify({ url: sourceUrl, taskId, userId: uid, provider }),
      signal: ctl.signal,
      cache: "no-store",
    });
    const payload = await resp.json().catch(() => null);
    if (!resp.ok || !payload?.url) {
      console.error("[finalize] remux failed", resp.status, payload);
      return NextResponse.json({
        url: sourceUrl,
        fallback: true,
        reason: `remux_${resp.status}`,
      });
    }
    return NextResponse.json({
      url: payload.url,
      thumbnailUrl: payload.thumbnailUrl,
      cached: Boolean(payload.cached),
    });
  } catch (err) {
    console.error("[finalize] remux exception", err);
    return NextResponse.json({
      url: sourceUrl,
      fallback: true,
      reason: "remux_unreachable",
    });
  } finally {
    clearTimeout(timer);
  }
}
