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
  body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
})
const { access_token } = await tokRes.json()
if (!access_token) { console.error("failed to get token"); process.exit(1) }

const rel = await fetch(
  `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`,
  { headers: { Authorization: `Bearer ${access_token}` } },
)
const releaseJson = await rel.json()
const rulesetName = releaseJson.rulesetName
if (!rulesetName) {
  console.log(JSON.stringify(releaseJson, null, 2))
  process.exit(1)
}

const rules = await fetch(
  `https://firebaserules.googleapis.com/v1/${rulesetName}`,
  { headers: { Authorization: `Bearer ${access_token}` } },
)
const rulesJson = await rules.json()
const files = rulesJson?.source?.files || []
for (const f of files) {
  console.log(`=== ${f.name} ===`)
  console.log(f.content)
  console.log()
}
console.log(`\n(release: ${releaseJson.name}, ruleset: ${rulesetName})`)
