#!/usr/bin/env node
import { readFileSync } from "node:fs"
import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

// Minimal .env.local loader
try {
  const raw = readFileSync(".env.local", "utf8")
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m) continue
    let val = m[2]
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[m[1]]) process.env[m[1]] = val
  }
} catch {}

const email = process.argv[2]
const amount = Number(process.argv[3])

if (!email || !Number.isFinite(amount)) {
  console.error("Usage: node scripts/grant-credits.mjs <email> <amount>")
  process.exit(1)
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n")

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_ADMIN_* env vars in .env.local")
  process.exit(1)
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}

const auth = getAuth()
const db = getFirestore()

const user = await auth.getUserByEmail(email)
const ref = db.collection("users").doc(user.uid)
const before = (await ref.get()).data()?.tokenBalance ?? 0

await ref.set({ tokenBalance: FieldValue.increment(amount) }, { merge: true })

const after = (await ref.get()).data()?.tokenBalance ?? 0
console.log(JSON.stringify({ email, uid: user.uid, before, added: amount, after }, null, 2))
