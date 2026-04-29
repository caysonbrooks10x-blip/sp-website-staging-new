---
name: studiox-design-tokens
description: Project-specific aesthetic memory for StudioX (sp-website-staging-new). Auto-loaded when working in this repo. Captures the actual fonts, palette, motion patterns, card styles, icon strategies, and copy-voice rules so future-me doesn't have to rediscover them every session. Pair with `frontend-design` (direction) and `visual-iteration-frontend` (iteration discipline).
---

This skill encodes how StudioX actually looks and behaves, derived from the live codebase. Treat as ground truth for any UI work in this project.

## Stack

- Next.js 16 (App Router)
- Tailwind + shadcn/ui (`@/components/ui/*`)
- GSAP for scroll/timeline animations
- Framer Motion (`motion`) for component-level transitions
- Firebase client SDK + Admin SDK
- ~72 components in `components/`, organised by feature area: `studio/`, `claw/`, `profile/`, `community/`, `pricing-*`, `scroll-states/`, `marketplace/`

## Type system (already loaded — never import new fonts for one-off needs)

```ts
// app/layout.tsx
import { Playfair_Display, Inter } from "next/font/google"
//   --font-serif → Playfair Display      (display headlines, italic accents)
//   --font-sans  → Inter                  (body, UI)
```

CSS variables: `var(--font-serif)`, `var(--font-sans)`. Reach for `font-family: var(--font-serif), Georgia, serif` for any editorial moment. Don't add a third font.

## Palette

Dark-first (oklch) system in `app/globals.css`:

```css
--background: oklch(0.02 0 0)        /* near-black canvas */
--foreground: oklch(0.98 0 0)        /* near-white text */
--card:       oklch(0.18 0.005 260)  /* cool dark card */
--muted:      oklch(0.32 0.005 260)
--accent:     oklch(0.7 0.15 250)    /* periwinkle/blue accent */
--secondary:  oklch(0.22 0.005 260)
```

Plus hard-coded section colors used outside the token system:
- **Cyan** (`cyan-300/400/500`) — Studio + Claw active states, gradient pills, primary CTA buttons
- **Emerald** (`emerald-400`) — bonus pills, success
- **Amber** (`amber-700/800` + `#fde68a`, `#d97706`) — stars, sparks, warm sections
- **Cream/parchment** (`#fef9ec → #f7f0dd → #f0e8d2`) — the editorial reviews-section background, light break against the dark pages

## When to switch to a light section

The whole site is dark zinc/black. **Insert at least one light section break** so the page doesn't read as one undifferentiated block. The reviews carousel uses cream + serif headlines for this reason. Don't put two light sections back-to-back; alternate.

## Fixed motion patterns

### Marquees (3 places: brand strip, payment strip, reviews)
```ts
const trackRef = useRef<HTMLDivElement>(null)
const singleSetRef = useRef<number>(0)
const pausedRef = useRef(false)  // mirror of state — RAF reads this, not state directly

useEffect(() => {
  setTimeout(() => { singleSetRef.current = trackRef.current!.scrollWidth / N }, 120)
  // N = 3 or 4 (number of duplicated copies in the track)
  // Speed: 26-35 px/sec
  // Wrap with: maskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)'
}, [])
```

Always pause-on-hover (`onMouseEnter` → `setPaused(true)`, `onMouseLeave` → false). Mirror state into `useRef` because the RAF closure needs the current value without re-subscribing.

### GSAP for scroll-driven hero, Framer Motion for component transitions
- Don't mix the two on the same element
- Hero canvas + intro reveals: GSAP timelines (`scroll-states/hero-state.tsx`)
- Card hover, AnimatePresence, layout transitions: Framer Motion (`<motion.span>`, `<AnimatePresence>`)

## Card patterns

| Pattern | Where used | Recipe |
|---|---|---|
| **Dark glass card** | Studio panels, Claw cards, pricing cards | `bg-white/[0.02-0.04] border border-white/10 rounded-2xl backdrop-blur-sm hover:bg-white/[0.06]` |
| **Liquid glass** | AppCard, Studio Collective, marketplace tiles | invoke `liquid-glass` skill — has its own conventions |
| **Paper testimonial** | Reviews carousel | white bg, slight per-card rotation (-1.4° to 1.4°), drop-shadow `0 8px 24px -10px rgba(40,30,15,0.18)`, hover resets rotation + scales 1.015× |
| **Cyan-accent quick action** | Claw hub quick actions | dark card + 64×64 illustrated tile inside, `radial-gradient(120%_120%_at_30%_20%, ...)` background per accent color |

## Icon + image strategy

**For 3rd-party logos** (brand strip, payment marquee):
```tsx
<img
  src={`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg`}
  onError={() => setBroken(true)}     // ALWAYS hide failed loads
  style={{ filter: "invert(1)" }}      // for white-on-dark
/>
```
Don't use `cdn.simpleicons.org` — 404s on many slugs. jsdelivr mirror covers the full catalog. Verify slugs return 200 with a `curl` loop before committing.

**For feature/section icons** that need to feel painterly: hand-build inline SVG components, not stock Lucide. Pattern lives in `components/claw/quick-action-art.tsx` — 64×64 viewBox, gradient fills, soft shadows, focal sparkle. Compose recognisable real-world objects (frames, film strips, coin stacks), not abstract glyphs.

**For real human portraits**: Unsplash specific photo IDs with stable seeds (`?w=200&h=200&fit=crop&crop=faces`). Don't use `randomuser.me` — mismatches names with faces. Match name's cultural register to the photo (English persona → Western portrait, etc).

## Copy voice rules

**Don't:**
- Use em dashes (`—`) in user-facing copy. AI tell.
- Wrap testimonials in `&ldquo;…&rdquo;` smart quotes. AI tell.
- Write rhetorical structures like "It just works — and that's everything."
- Promise features that aren't shipped (e.g. don't show a "Workflow" sidebar item in marketing copy if it was removed)

**Do:**
- Concrete specifics: times, tool counts, numbers ("cut my pre-viz cycle from a week to an afternoon", "cancelled three other tools the same day")
- Reference the product by name (StudioX) inside testimonial bodies
- Short sentences, periods over dashes, no rhetorical asides
- All-English persona names paired with matching Western portraits when using stock photos

## Capability flags must mirror server-side enforcement

`lib/model-config.ts` `supports*` flags drive UI controls. **A flag should be `true` only if the wire field it produces survives both primary and fallback provider normalisers** in `lib/provider-router.ts`.

Two ways flags lie silently:
1. Field is in `STUDIO_INTERNAL_PAYLOAD_FIELDS` strip list (e.g. `mode`, `characterLock`, `cameraMovement`) — never reaches provider
2. Field isn't in the model's explicit `pickPayloadFields([...])` allow-list

Cross-check before adding any new `supports*` flag. See `technical.md` "Capability flags must mirror the routing intersection" for the worked example.

## Section gating flag

```
NEXT_PUBLIC_CLAW_WORKFLOWS_ENABLED === "1"
```
Single env var that gates ALL Claw hub dashboard sections (workflow cards, recent activity, automation panel, Telegram bot card, workflows library). Set to `"1"` in Vercel to bring back; leave unset to keep the page focused on quick actions. Don't add separate flags per section — that's how drift starts.

## Hero canvas demo

The animated canvas on the homepage hero (`components/scroll-states/hero-state.tsx`) advertises product features through its rendered sidebar. **Always mirror the real Studio sidebar** (`components/studio/sidebar.tsx`):

Real items in order: `Plus (Create New) / Video (Text to Video) / ImageIcon (Text to Image) / Layers (Image to Image) / GalleryHorizontalEnd (My Creations) / Users (Community) / Bot (Claw Bot)`.

Don't show ghost features there. If a sidebar item is removed from Studio, remove it from the hero demo in the same change.

## Project conventions worth knowing

- **NEVER** modify existing studio components (`left-panel.tsx`, `center-canvas.tsx`) unless explicitly asked — covered in root `CLAUDE.md`
- **NEVER** import claw-gateway code into the Next.js app
- All new Claw UI goes in `components/claw/` (not `components/studio/`)
- Firebase client SDK is for browser, Admin SDK is for server-side `app/api/*` routes

## Worked iterations from this repo (see `changelog.md` for full history)

- **2026-04-25 reviews redesign**: dark-on-dark → cream/parchment editorial w/ Playfair serif + dual marquee + paper-tilt cards + photo avatars + pause-on-hover. Three iterations to land.
- **2026-04-25 brand/payment strip**: simpleicons.org → jsdelivr (catalog gap), added onError fallback, verified slugs.
- **2026-04-25 Claw quick actions**: emoji → Lucide (still felt generic) → custom inline SVG illustrations in `components/claw/quick-action-art.tsx`.
- **2026-04-25 video pipeline**: see `technical.md` "Video pipeline: faststart remux + CORS" for the full story.

## Pair with

- **Global** `frontend-design` — pick the aesthetic direction first
- **Global** `visual-iteration-frontend` — iteration discipline (verify CDNs, layered fallbacks, audit lying flags)
- **Global** `liquid-glass` — when working on AppCard, Studio Collective, marketplace tiles
- **Global** `react-best-practices` — for perf-sensitive work
