#!/usr/bin/env node
import { readFileSync } from "node:fs"
import { createSign } from "node:crypto"

try {
  const raw = readFileSync(".env.local", "utf8")
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m) continue
    let val = m[2]
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    if (!process.env[m[1]]) process.env[m[1]] = val
  }
} catch {}

const domain = process.argv[2]
if (!domain) { console.error("Usage: node scripts/add-authorized-domain.mjs <domain>"); process.exit(1) }

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n")

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

const now = Math.floor(Date.now() / 1000)
const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
const payload = b64url(JSON.stringify({
  iss: clientEmail,
  scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase",
  aud: "https://oauth2.googleapis.com/token",
  iat: now, exp: now + 3600,
}))
const sig = b64url(createSign("RSA-SHA256").update(`${header}.${payload}`).sign(privateKey))
const jwt = `${header}.${payload}.${sig}`

const tokRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
})
const tokJson = await tokRes.json()
const accessToken = tokJson.access_token
if (!accessToken) { console.error("token err", tokJson); process.exit(1) }

const cfgUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`
const cfgRes = await fetch(cfgUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
const cfg = await cfgRes.json()
const existing = cfg.authorizedDomains || []
if (existing.includes(domain)) {
  console.log(JSON.stringify({ ok: true, alreadyPresent: true, domain, total: existing.length }, null, 2))
  process.exit(0)
}
const next = [...existing, domain]

const patchRes = await fetch(`${cfgUrl}?updateMask=authorizedDomains`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  body: JSON.stringify({ authorizedDomains: next }),
})
const patchJson = await patchRes.json()
if (!patchRes.ok) { console.error("patch err", patchJson); process.exit(1) }
console.log(JSON.stringify({ ok: true, added: domain, total: patchJson.authorizedDomains?.length }, null, 2))
