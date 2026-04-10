# StudioX + StudioX Claw 🦞

## Quick Start

```bash
# Existing Next.js app
cd sp-website-staging-new && npm install && npm run dev   # port 3000

# New Gateway service
cd ../claw-gateway && npm install && npm run dev          # port 3001

# Firebase emulator (for tests)
firebase emulators:start --only firestore
```

## Dev Commands

```bash
# Next.js
npm run dev        # dev server (port 3000)
npm run build      # production build
npm run lint       # ESLint

# Gateway (from ../claw-gateway/)
npm run dev        # ts-node-dev watch
npm run build      # tsc → dist/
npm run test       # vitest (requires Firebase emulator running)

# Discord (one-time, run after any slash command changes)
cd ../claw-gateway && npx ts-node scripts/register-commands.ts
```

## Environment Variables

**Next.js** (`.env.local`):
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_CLAW_WS_URL=ws://localhost:3001/ws/claw
```

**Gateway** (`../claw-gateway/.env`):
```
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_ADMIN_CLIENT_EMAIL=
CLAW_GATEWAY_PORT=3001
CLAW_GATEWAY_HOST=http://localhost:3001
```

## Architecture

Two separate services — never cross-import:
1. **Next.js app** (`sp-website-staging-new/`) — existing web studio, DO NOT refactor
2. **Claw Gateway** (`claw-gateway/`) — Node.js 20 bot + agent layer

Shared: Firebase project (Admin SDK in Gateway, Client SDK in Next.js)

**New Next.js additions:**
- Pages: `app/claw/` (pair, hub, schedule)
- API: `app/api/claw/` (pairing, skills, memory)
- Components: `components/claw/` (WebChatWidget, SkillCard, etc.)

**Gateway structure:**
- `src/channels/` — Telegram, Discord, WebSocket adapters
- `src/agent/` — AgentCore, SessionContext
- `src/skills/` — SkillRegistry, SkillExecutor
- `src/memory/` — UserMemory, SOUL.md loader
- `src/scheduler/` — SchedulerEngine, HeartbeatEngine
- `src/pairing/` — PairingService, LinkResolver
- `skills/*.md` — 19 built-in SKILL.md files (data, never code)
- `identity/SOUL.md`, `identity/IDENTITY.md`

## Key Rules

1. NEVER modify existing studio components (left-panel.tsx, center-canvas.tsx, etc.)
2. NEVER import claw-gateway code into the Next.js app (or vice versa)
3. NEVER generate without a credit check — read LIVE from Firestore, never cache
4. NEVER generate without sending an immediate ack first (Telegram/Discord 3s timeout)
5. NEVER use Math.random() for pairing codes — use crypto.randomInt()
6. NEVER execute skill markdown as code — skills/*.md are data files only
7. All new Claw UI goes in `components/claw/` — never in `components/studio/`
8. Firebase Admin in Gateway: import only from `src/firebase-admin.ts` (single instance)
9. Discord slash commands: register via `scripts/register-commands.ts` (not at bot startup)
10. NodeNext module resolution in Gateway: local imports need `.js` extension

## Non-Obvious Gotchas

- Telegram webhook timeout: 3s → send "Got it! Generating..." BEFORE awaiting the job. Deliver result as separate message via onSnapshot.
- Discord interaction timeout: 3s → always `interaction.deferReply()` first, then `interaction.editReply()` for result.
- Firebase Admin private key newlines: parse with `key.replace(/\\n/g, '\n')` in config.ts.
- NodeNext `.js` imports: write `import { foo } from './foo.js'` — TS resolves to .ts at compile time.
- Firestore onSnapshot pairing listeners: unsubscribe after 10 minutes with `setTimeout(unsubscribe, 600000)`.
- Discord slash command registration: one-time REST call, takes up to 1h to propagate globally.
- gray-matter YAML: colon in string values must be quoted: `description: "Generates 16:9 videos"`.
- Credit balance field in Firestore: check `users/{uid}.tokenBalance` (see auth-context.tsx line ~50).

## Slash Commands (planned)

- `/claw-test` — send a test generation to linked channel
- `/claw-pair` — generate a pairing code from CLI
