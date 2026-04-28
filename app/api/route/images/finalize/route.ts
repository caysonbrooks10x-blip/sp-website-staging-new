import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type FinalizeBody = {
  taskId?: string;
  sourceUrl?: string;
  sourceUrls?: string[];
  provider?: string;
};

async function rehostOne(args: {
  remuxBase: string;
  remuxSecret: string;
  url: string;
  taskId: string;
  userId: string;
  index: number;
}): Promise<{ url: string; fallback?: boolean; reason?: string }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 45_000);
  try {
    const resp = await fetch(`${args.remuxBase}/internal/image/rehost`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": args.remuxSecret,
      },
      body: JSON.stringify({
        url: args.url,
        taskId: args.taskId,
        userId: args.userId,
        index: args.index,
      }),
      signal: ctl.signal,
      cache: "no-store",
    });
    const payload = await resp.json().catch(() => null);
    if (!resp.ok || !payload?.url) {
      console.error("[image-finalize] rehost failed", resp.status, payload);
      return { url: args.url, fallback: true, reason: `rehost_${resp.status}` };
    }
    return { url: payload.url };
  } catch (err) {
    console.error("[image-finalize] rehost exception", err);
    return { url: args.url, fallback: true, reason: "rehost_unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

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
  const taskId = body?.taskId;
  const sourceUrls = body?.sourceUrls?.length
    ? body.sourceUrls
    : body?.sourceUrl
      ? [body.sourceUrl]
      : [];

  if (!taskId || sourceUrls.length === 0) {
    return NextResponse.json(
      { error: "taskId and sourceUrl(s) required" },
      { status: 400 },
    );
  }
  for (const u of sourceUrls) {
    if (!/^https:\/\//.test(u)) {
      return NextResponse.json({ error: "https url required" }, { status: 400 });
    }
  }

  const remuxBase = process.env.VIDEO_REMUX_URL;
  const remuxSecret = process.env.VIDEO_REMUX_SECRET;

  if (!remuxBase || !remuxSecret) {
    console.warn("[image-finalize] remux service not configured; returning source URLs");
    return NextResponse.json({
      urls: sourceUrls,
      url: sourceUrls[0],
      fallback: true,
      reason: "remux_disabled",
    });
  }

  const results = await Promise.all(
    sourceUrls.map((u, i) =>
      rehostOne({ remuxBase, remuxSecret, url: u, taskId, userId: uid, index: i }),
    ),
  );

  const finalUrls = results.map((r) => r.url);
  const anyFallback = results.some((r) => r.fallback);
  return NextResponse.json({
    urls: finalUrls,
    url: finalUrls[0],
    fallback: anyFallback || undefined,
  });
}
