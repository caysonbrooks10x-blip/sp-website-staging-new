import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type BackfillBody = { creationId?: string };

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let uid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as BackfillBody | null;
  const creationId = body?.creationId;
  if (!creationId) {
    return NextResponse.json({ error: "creationId required" }, { status: 400 });
  }

  const remuxBase = process.env.VIDEO_REMUX_URL;
  const remuxSecret = process.env.VIDEO_REMUX_SECRET;
  if (!remuxBase || !remuxSecret) {
    return NextResponse.json({ error: "remux not configured" }, { status: 500 });
  }

  const docRef = getAdminDb()
    .collection("users").doc(uid)
    .collection("creations").doc(creationId);

  const snap = await docRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const data = snap.data() || {};
  const isVideo =
    data.type === "video" ||
    (typeof data.outputUrl === "string" && data.outputUrl.includes(".mp4"));
  if (!isVideo) {
    return NextResponse.json({ skipped: "not a video", id: creationId });
  }

  const sourceUrl: string | undefined = data.outputUrl;
  if (!sourceUrl || !/^https:\/\//.test(sourceUrl)) {
    return NextResponse.json({ error: "no source url" }, { status: 400 });
  }

  // If already finalised AND has thumbnail, skip (idempotent).
  const isFirebaseStorage = sourceUrl.includes("storage.googleapis.com");
  const hasThumb = Boolean(data.thumbnailUrl);
  if (isFirebaseStorage && hasThumb) {
    return NextResponse.json({ skipped: "already finalised", id: creationId });
  }

  const provider = data.generationPlatform === "apimart" ? "apimart" : "poyo";

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 50_000);
  try {
    const resp = await fetch(`${remuxBase}/internal/video/faststart`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": remuxSecret,
      },
      body: JSON.stringify({
        url: sourceUrl,
        taskId: data.taskId || creationId,
        userId: uid,
        provider,
      }),
      signal: ctl.signal,
      cache: "no-store",
    });
    const payload = await resp.json().catch(() => null);
    if (!resp.ok || !payload?.url) {
      console.error("[backfill] remux failed", resp.status, payload);
      return NextResponse.json({ error: "remux failed" }, { status: 502 });
    }

    const update: Record<string, unknown> = { outputUrl: payload.url };
    if (Array.isArray(data.outputUrls) && data.outputUrls.length > 0) {
      update.outputUrls = [payload.url, ...data.outputUrls.slice(1)];
    } else {
      update.outputUrls = [payload.url];
    }
    if (payload.thumbnailUrl) update.thumbnailUrl = payload.thumbnailUrl;
    await docRef.update(update);

    return NextResponse.json({
      id: creationId,
      url: payload.url,
      thumbnailUrl: payload.thumbnailUrl,
      cached: Boolean(payload.cached),
    });
  } catch (err) {
    console.error("[backfill] exception", err);
    return NextResponse.json({ error: "remux unreachable" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
