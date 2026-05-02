/**
 * One-shot helper: add a Vercel preview hostname to Firebase Auth's
 * authorized domains list. Run from the repo root with:
 *
 *   PREVIEW_DOMAIN=studiox-xxxxx.vercel.app \
 *     npx tsx --env-file=.env.local scripts/add-firebase-domain-preview.ts
 */
import { GoogleAuth } from "google-auth-library";

async function main(): Promise<void> {
  const newDomain = process.env.PREVIEW_DOMAIN;
  if (!newDomain) {
    throw new Error("Set PREVIEW_DOMAIN env (e.g. studiox-xxx.vercel.app)");
  }
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID!;
  const gauth = new GoogleAuth({
    credentials: { client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const token = (await (await gauth.getClient()).getAccessToken()).token;
  const cur = (await (await fetch(
    `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/config`,
    { headers: { Authorization: `Bearer ${token}` } },
  )).json()) as { authorizedDomains?: string[] };
  const have = cur.authorizedDomains ?? [];
  console.log("existing count:", have.length);
  if (have.includes(newDomain)) {
    console.log("already includes:", newDomain);
    return;
  }
  const domains = Array.from(new Set([...have, newDomain]));
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/config?updateMask=authorizedDomains`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ authorizedDomains: domains }),
    },
  );
  console.log("patch status:", r.status, "new total:", domains.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
