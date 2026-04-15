# Deployment Readiness Checklist

Sprint B · Phase 5 · #15 from `final_fixes.pdf`. Run through this list before every promotion to production.

## 1. Required environment variables (Vercel → Project → Settings → Environment Variables)

The canonical list lives in [`lib/env-guard.ts`](../lib/env-guard.ts) — production will refuse to boot if any of these are missing or contain a placeholder marker.

### Server-side (Production scope)
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY` (base64-encoded private key, `\n` escaped)
- `APIMART_API_KEY`

### Public / client-side (Production scope)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Optional but recommended
- `POYO_API_KEY` — if Poyo fallback is live
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` — if Firebase Analytics is on

### Values that **must not** appear
Placeholder markers (`AIzaSyDUMMY*`, `demo-*`, `your-*`, `*_here`, `1234567890`, `G-DEMO*`) are detected by `isDummy()` in `lib/env.ts`. If any of these leak into a real env value in Vercel, the app will refuse to boot.

## 2. Firebase setup
- [ ] Firestore database exists in `us-central1` (or matches `getFunctions` region in `lib/firebaseClient.ts`)
- [ ] Service account has `Cloud Datastore User` + `Firebase Admin SDK Administrator Service Agent`
- [ ] Security rules published (not in default open state)
- [ ] `generations` collection exists and is writable by the admin SDK — this is where `recordGenerationCost` persists

## 3. Dev/mock scrub
- [ ] No `dev-user-*` / `dev-uid-*` literals in `lib/`
- [ ] No hardcoded test API keys
- [ ] No `setInterval` inside `app/api/*` (polling must be client-side per PDF)
- [ ] Firebase client loaded via `requireEnv()`, not direct `process.env` access

The `verify-prod-readiness.ts` smoke enforces all of these.

## 4. Logging
- [ ] Vercel runtime logs show structured JSON entries (`{ "level": "info", "message": "...", "timestamp": "...", "request_id": "..." }`)
- [ ] `LOG_DEBUG=1` is **not** set in production (debug-level events suppressed by default)

## 5. Cost tracking
- [ ] `recordGenerationCost` calls succeed — spot-check a test generation, then confirm a document exists in Firestore `generations/{id}`
- [ ] If the Firestore sink fails, cost events fall back to log lines tagged `cost_record_fallback_to_log`

## 6. Rate limiting
- [ ] A durable rate-limit store is wired at boot (in-memory is fine locally but useless on Vercel — separate lambdas don't share state)
- [ ] The durable adapter uses a transaction for the read-modify-write in `RateLimitStore.apply()`

## 7. Polling discipline
- [ ] All long-running generation polls happen on the **client** — API route handlers return fast with a task id, then the browser polls `/api/.../tasks/:id` at whatever cadence it chooses
- [ ] No server-side `setInterval` / `setTimeout` loops inside route handlers (Vercel kills lambdas at their timeout regardless)

## 8. CI gate
- [ ] `Sprint A provider harness` is a required status check on `main` (see Branch Protection)
- [ ] The workflow runs all offline smokes: env, logger, cost, registry, scheduler, rate-limit, sprint-a, prod-readiness
- [ ] Plus the Next.js + mock providers integration harness (20/20)

## 9. Pre-release sanity command

From the repo root, run:
```
npx tsx scripts/verify-prod-readiness.ts
```

Expected: all assertions pass. If any fail, do not promote.

## 10. Post-deploy smoke
- [ ] Hit the production URL and confirm 200 on `/`
- [ ] Confirm a real generation end-to-end (image or video) and check that a `generations/{id}` record was written
- [ ] Vercel runtime logs show structured entries for the generation path

## What's intentionally out of scope (PDF: future scaling)
- #14 Queue system (Redis / BullMQ) — async processing, not required at current scale
- #12 UI↔backend parameter reflection — needs dedicated UI work, tracked separately
