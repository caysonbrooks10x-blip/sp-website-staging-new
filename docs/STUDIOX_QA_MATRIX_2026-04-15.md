# StudioX QA Matrix — Provider Routing v2

**Date:** 2026-04-15  
**Source of truth:** `/Users/a1/Downloads/STUDIOX_PROVIDER_ROUTING_HANDOFF_2026-04-15_FULL.md` §13 + §14  
**Code under test:**
- `lib/provider-routing.ts` (4-stage router + FALLBACK_MAP derived from MODEL_PROVIDERS)
- `lib/poyo.ts` (direct Poyo client)
- `lib/model-config.ts` (29 new models added in Step 3, `ignoresArOnRef` flag in Step 6)
- `lib/studio-enhancements.ts` (Wan 2.6 templates + Hailuo 2.3 camera tokens)
- `lib/studio-two-step.ts` (2-step AR pipeline — auto-triggered, no flag since Sprint A)
- `app/studio/page.tsx` (handleGenerate wires gates + 2-step branch)
- `components/studio/left-panel.tsx` (model-aware UI controls)

This doc is a manual QA test plan. Each row is one test case. Mark
Pass/Fail and capture the **actual cost** charged on the provider
dashboard so we can resolve the §14 price gaps that the handoff flagged
as "TBD — verify on a real run."

> **2026-04-18 reality check:** this matrix contains archival rows from the
> broader provider-research phase. The active public Studio web surface is now
> narrower and is defined by `lib/model-config.ts` -> `VIDEO_MODEL_PRIORITY`.
> If a model is not in that keep-list, treat its row here as historical rather
> than release-blocking. Telegram should mirror `VIDEO_MODEL_PRIORITY`, not the
> full archival matrix.

---

## How to run

1. Set both env vars:
   ```
   POYO_API_KEY=<key>
   APIMART_API_KEY=<key>
   ```
2. Run `npm run dev` and open the Studio page.
3. For each row: pick the model + parameters listed, click Generate,
   wait for completion, then fill in the **observed provider** (network
   tab — `/api/apimart/...` vs `createStudioJob` Firebase callable),
   **observed cost** (Poyo dashboard credits × $0.005 OR ApiMart
   dashboard line item), and **Pass/Fail**.
4. For 2-step rows: pipeline auto-triggers when model ignores AR on
   the reference image AND reference AR differs from target AR. No env
   flag required since Sprint A Phase 1.

---

## Section A — Image models, default config (n=1)

Goal: confirm primary provider routing for every image model, and that
no model resolves to `null` or 404s.

| # | Model | Inputs | Expected provider | Expected gate | Observed provider | Observed cost USD | Pass/Fail |
|---|-------|--------|-------------------|---------------|-------------------|-------------------|-----------|
| A1 | nano-banana | text-only, n=1 | poyo | n=1 keeps poyo | | | |
| A2 | nano-banana | text-only, n=4 | apimart | gateToApimart `n>1` | | | |
| A3 | nano-banana-2 | text-only, n=1 | apimart | primary apimart, also poyo | | | |
| A4 | nano-banana-2 | text-only, n=2 | apimart | gateToApimart `n>1` (no-op since primary already apimart, but gate enforces never going to also=poyo for n>1) | | | |
| A5 | nano-banana-2 | text-only, AR=4:1 | apimart | gateToApimart `extreme_ar` | | | |
| A6 | nano-banana-2 | text-only, res=0.5K | apimart | gateToApimart `res=0.5K` | | | |
| A7 | nano-banana-2-new | text-only, n=1 | apimart | primary apimart, also poyo | | | |
| A8 | nano-banana-2-official | text-only | apimart | primary | | | |
| A9 | nano-banana-2-official | text-only, res=0.5K | poyo | gateToPoyo `res=0.5K` | | | |
| A10 | nano-banana-pro | text-only | poyo | only on poyo | | | |
| A11 | gpt-4o-image | text-only | apimart | primary | | | |
| A12 | gpt-4o-image | with mask_url | apimart | gateToApimart `mask_url` | | | |
| A13 | gpt-image-1.5 | text-only | poyo | primary | | | |
| A14 | gpt-image-1.5 | with mask_url | apimart | gateToApimart `mask_url` | | | |
| A15 | gpt-image-1.5 | official_tier=true | apimart | gateToApimart `official_tier` | | | |
| A16 | gpt-image-1 | text-only | apimart | only on apimart | | | |
| A17 | gpt-image-1-mini | text-only | apimart | only on apimart | | | |
| A18 | flux-2-pro | text-only | apimart | also poyo | | | |
| A19 | flux-2-flex | text-only | apimart | also poyo | | | |
| A20 | flux-kontext-pro | text-only | apimart | also poyo | | | |
| A21 | flux-kontext-max | text-only | apimart | also poyo | | | |
| A22 | seedream-4 | text-only | apimart | also poyo | | | |
| A23 | seedream-4.5 | text-only | poyo | also apimart | | | |
| A24 | seedream-5.0-lite | text-only | poyo | only on poyo | | | |
| A25 | z-image | text-only | poyo | only on poyo (apimart removed P0) | | | |
| A26 | z-image-turbo | text-only | apimart | only on apimart | | | |
| A27 | qwen-image-2.0 | text-only | apimart | only on apimart | | | |
| A28 | qwen-image-2.0-pro | text-only | apimart | only on apimart | | | |
| A29 | grok-imagine-image | text-only | apimart | also poyo | | | |
| A30 | wan-2.7-image | text-only | poyo | only on poyo | | | |
| A31 | wan-2.7-image-pro | text-only | poyo | only on poyo | | | |
| A32 | kling-o1-image-edit | with image_url | poyo | only on poyo | | | |
| A33 | kling-o3-image | text-only | poyo | only on poyo | | | |
| A34 | kling-o3-image-edit | with image_url | poyo | only on poyo | | | |

---

## Section B — Video models, default config

| # | Model | Inputs | Expected provider | Expected gate | Observed provider | Observed cost USD | Pass/Fail |
|---|-------|--------|-------------------|---------------|-------------------|-------------------|-----------|
| B1 | sora-2 | text-only | apimart | live override: Poyo 404ed during 2026-04-18 probes | | | |
| B2 | sora-2 | remix existing | apimart | gateToApimart `remix` | | | |
| B3 | sora-2 | character lock on | apimart | hard gate Stage 1 | | | |
| B4 | sora-2 | preview tier | apimart | gateToApimart `preview` | | | |
| B5 | sora-2-pro | text-only | poyo | also apimart | | | |
| B6 | sora-2-vip | text-only | apimart | only on apimart | | | |
| B7 | sora-2-preview | text-only | apimart | only on apimart | | | |
| B8 | sora-2-pro-preview | text-only | apimart | only on apimart | | | |
| B9 | sora-2-official | text-only | poyo | only on poyo (legacy / not in current web keep-list) | | | |
| B10 | veo3.1-lite | text-only | apimart | only on apimart | | | |
| B11 | veo3.1-fast | text-only | apimart | also poyo | | | |
| B12 | veo3.1-quality | text-only | apimart | also poyo | | | |
| B13 | veo3.1-quality | generation_type=reference | poyo | gateToPoyo | | | |
| B14 | veo3.1-fast-official | text-only | apimart | only on apimart | | | |
| B15 | veo3.1-quality-official | text-only | apimart | only on apimart | | | |
| B16 | kling-2.1/standard | text-only | poyo | only on poyo | | | |
| B17 | kling-2.1/pro | text-only | poyo | only on poyo | | | |
| B18 | kling-2.5-turbo-pro | text-only | poyo | only on poyo (apimart removed P0) | | | |
| B19 | kling-2.6 | text-only | apimart | also poyo | | | |
| B20 | kling-2.6 | last_frame_image without pro_mode | poyo | gateToPoyo | | | |
| B21 | kling-3.0/standard | text-only | apimart | also poyo | | | |
| B22 | kling-3.0/standard | with kling_elements | poyo | gateToPoyo | | | |
| B23 | kling-3.0/pro | text-only | apimart | also poyo | | | |
| B24 | kling-3.0/pro | with kling_elements | poyo | gateToPoyo | | | |
| B25 | kling-2.6-motion-control | with image_url | poyo | only on poyo | | | |
| B26 | kling-3.0-motion-control | with image_url | poyo | only on poyo (apimart removed P0) | | | |
| B27 | kling-v3-omni | text-only | apimart | only on apimart | | | |
| B28 | kling-video-o1 | text-only | apimart | only on apimart | | | |
| B29 | seedance-1.0-pro | text-only | poyo | also apimart | | | |
| B30 | seedance-1.5-pro | text-only | poyo | also apimart | | | |
| B31 | seedance-2 | text-only | poyo | only on poyo | | | |
| B32 | seedance-2-fast | text-only | poyo | only on poyo | | | |
| B33 | doubao-seedance-2.0 | text-only | apimart | ApiMart-native wire name; Poyo only accepts `seedance-2` | | | |
| B34 | doubao-seedance-2.0-face | with image_url | apimart | only on apimart | | | |
| B35 | doubao-seedance-2.0-fast-face | with image_url | apimart | only on apimart | | | |
| B36 | hailuo-02 | text-only | poyo | also apimart | | | |
| B37 | hailuo-02-pro | text-only | poyo | only on poyo (apimart removed P0) | | | |
| B38 | hailuo-2.3 | text-only | apimart | also poyo | | | |
| B39 | hailuo-2.3 | camera="dolly in" | apimart | gateToApimart `camera_movement_set`; expect `[推进]` prepended | | | |
| B40 | MiniMax-Hailuo-2.3-Fast | text-only | apimart | only on apimart | | | |
| B41 | wan2.2-text-to-video-fast | text-only | poyo | only on poyo | | | |
| B42 | wan2.2-image-to-video-fast | with image_url | poyo | only on poyo | | | |
| B43 | wan2.5-text-to-video | text-only | poyo | only on poyo | | | |
| B44 | wan2.5-image-to-video | with image_url | poyo | only on poyo | | | |
| B45 | wan2.6-text-to-video | text-only | apimart | also poyo | | | |
| B46 | wan2.6-text-to-video | template="squish" | apimart | gateToApimart `template_set`; expect `template:"squish"` in payload, NOT prose | | | |
| B47 | wan2.6-image-to-video | with image_url | apimart | also poyo | | | |
| B48 | wan2.6-image-to-video | template="dance1" | apimart | gateToApimart `template_set`; expect `template:"dance1"` in payload | | | |
| B49 | wan2.6-video-to-video | with video_url | poyo | only on poyo | | | |
| B50 | wan2.6-i2v-flash | with image_url | apimart | only on apimart | | | |
| B51 | wan-animate-move | with image_url | poyo | only on poyo (apimart removed P0) | | | |
| B52 | wan-animate-replace | with image_url | poyo | only on poyo (apimart removed P0) | | | |
| B53 | grok-vid | text-only | apimart | also poyo | | | |
| B54 | grok-imagine-1.0-video-apimart | text-only | apimart | only on apimart | | | |
| B55 | runway-gen-4.5 | text-only | poyo | only on poyo | | | |
| B56 | viduq3 | text-only | apimart | only on apimart | | | |
| B57 | viduq3-mix | text-only | apimart | only on apimart | | | |
| B58 | viduq3-pro | text-only | apimart | only on apimart | | | |
| B59 | viduq3-turbo | text-only | apimart | only on apimart | | | |

---

## Section C — Hailuo 2.3 Chinese camera tokens

Verify `applyStudioPromptEnhancements` prepends the correct `[token]`
inline to the prompt body when model is `hailuo-2.3` or
`MiniMax-Hailuo-2.3-Fast`. Inspect the request payload in DevTools.

| # | English label | Expected token | Pass/Fail |
|---|---------------|----------------|-----------|
| C1 | pan left | `[左移]` | |
| C2 | pan right | `[右移]` | |
| C3 | dolly in | `[推进]` | |
| C4 | dolly out | `[拉远]` | |
| C5 | boom up | `[上升]` | |
| C6 | boom down | `[下降]` | |
| C7 | rotate left | `[左摇]` | |
| C8 | rotate right | `[右摇]` | |
| C9 | orbit left | `[左环绕]` | |
| C10 | orbit right | `[右环绕]` | |
| C11 | zoom in | `[变焦推近]` | |
| C12 | zoom out | `[变焦拉远]` | |
| C13 | handheld shake | `[晃动]` | |
| C14 | follow subject | `[跟随]` | |
| C15 | static | `[固定]` | |

Also confirm: for any non-Hailuo model, the camera selection still
appears as English prose in the prompt (legacy behaviour).

---

## Section D — Wan 2.6 templates

For every `wan2.6-*` model, verify the picker shows all 12 templates,
and the submitted ApiMart payload contains a `template` field (NOT
inline prose). Inspect via DevTools network tab on
`/api/apimart/videos/generations`.

| # | Template | Pass/Fail |
|---|----------|-----------|
| D1 | squish | |
| D2 | rotation | |
| D3 | poke | |
| D4 | inflate | |
| D5 | dissolve | |
| D6 | melt | |
| D7 | icecream | |
| D8 | flying | |
| D9 | carousel | |
| D10 | singleheart | |
| D11 | dance1 | |
| D12 | dance2 | |

---

## Section E — 2-Step AR Pipeline (auto)

Pipeline auto-triggers — no flag needed. For each row, pick the listed
model with the listed reference image AR + target AR. Verify:
1. Toast shows "Reframing reference to {AR} via {model}..."
2. Network tab shows POST to `/api/apimart/images/generations` first,
   then the video submission with `image_url` set to the reframed URL.
3. Final video's actual aspect ratio matches the target.
4. Generate-button cost displays `$0.025` added on top.

| # | Video model | Ref AR | Target AR | n | Expected step-1 model | Pass/Fail |
|---|-------------|--------|-----------|---|-----------------------|-----------|
| E1 | seedance-1.0-pro | 1:1 | 16:9 | 1 | nano-banana-2-new-edit (Poyo) | |
| E2 | wan2.5-image-to-video | 1:1 | 9:16 | 1 | nano-banana-2-new-edit (Poyo) | |
| E3 | wan2.6-i2v-flash | 1:1 | 16:9 | 1 | nano-banana-2-new-edit (Poyo) | |
| E4 | kling-3.0-motion-control | 1:1 | 16:9 | 1 | nano-banana-2-new-edit (Poyo) | |
| E5 | wan-animate-replace | 1:1 | 16:9 | 1 | nano-banana-2-new-edit (Poyo) | |
| E6 | wan-animate-move | 1:1 | 16:9 | 1 | nano-banana-2-new-edit (Poyo) | |
| E7 | seedance-1.0-pro | 1:1 | 4:1 | 1 | gemini-3.1-flash-image-preview (extreme AR) | |
| E8 | seedance-1.0-pro | 1:1 | 16:9 | 2 | gemini-3.1-flash-image-preview (n>1) | |

Negative cases (must NOT trigger 2-step):

| # | Scenario | Expected | Pass/Fail |
|---|----------|----------|-----------|
| E9 | Flag off, ref+model that ignores AR | Skip 2-step entirely | |
| E10 | Flag on, no ref image | Skip 2-step entirely | |
| E11 | Flag on, ref AR matches target AR | Skip 2-step (referenceArMismatchesTarget false) | |
| E12 | Flag on, model.ignoresArOnRef !== true | Skip 2-step | |

---

## Section F — FALLBACK_MAP (provider down simulation)

Spoof `providerStatus="down"` via the dev panel. For each row, confirm
the generate uses the cross-provider mirror.

| # | Primary model | Expected fallback provider | Expected fallback model | Pass/Fail |
|---|---------------|----------------------------|-------------------------|-----------|
| F1 | sora-2 | none — hard fail until a working alternate live route is revalidated | — | |
| F2 | sora-2-pro | apimart | sora-2-pro | |
| F3 | seedream-4.5 | apimart | seedream-4.5 | |
| F4 | seedance-1.0-pro | apimart | seedance-1.0-pro | |
| F5 | seedance-1.5-pro | apimart | seedance-1.5-pro | |
| F6 | doubao-seedance-2.0 | apimart | doubao-seedance-2.0 | |
| F7 | hailuo-02 | apimart | hailuo-02 | |
| F8 | nano-banana | poyo | nano-banana | |
| F9 | nano-banana-2 | poyo | nano-banana-2 | |
| F10 | nano-banana-2-new | poyo | nano-banana-2-new | |
| F11 | gpt-4o-image | poyo | gpt-4o-image | |
| F12 | flux-2-pro | poyo | flux-2-pro | |
| F13 | flux-kontext-max | poyo | flux-kontext-max | |
| F14 | seedream-4 | poyo | seedream-4 | |
| F15 | grok-imagine-image | poyo | grok-imagine-image | |
| F16 | hailuo-2.3 | poyo | hailuo-2.3 | |
| F17 | kling-2.6 | poyo | kling-2.6 | |
| F18 | kling-3.0/standard | poyo | kling-3.0/standard | |
| F19 | kling-3.0/pro | poyo | kling-3.0/pro | |
| F20 | wan2.6-text-to-video | poyo | wan2.6-text-to-video | |
| F21 | wan2.6-image-to-video | poyo | wan2.6-image-to-video | |
| F22 | grok-vid | poyo | grok-vid | |
| F23 | veo3.1-fast | poyo | veo3.1-fast | |
| F24 | veo3.1-quality | poyo | veo3.1-quality | |
| F25 | sora-2-vip (no fallback) | none — hard fail | — | |
| F26 | wan-animate-move (no fallback) | none — hard fail | — | |

---

## Section G — Price gaps from §14 (capture real cost)

§14 of the FULL handoff lists models priced per-token rather than
per-call. Run one default-config job per model and record the actual
cost from the provider dashboard. This is the deliverable that closes
the §14 TBDs.

| # | Model | Provider | Default config | Observed cost USD | Notes |
|---|-------|----------|----------------|-------------------|-------|
| G1 | gpt-image-1 | apimart | n=1, 1024×1024 | | |
| G2 | gpt-image-1-mini | apimart | n=1, 1024×1024 | | |
| G3 | gpt-image-1.5 | poyo | n=1, default | | |
| G4 | gpt-4o-image | apimart | n=1, default | | |
| G5 | qwen-image-2.0 | apimart | n=1, default | | |
| G6 | qwen-image-2.0-pro | apimart | n=1, default | | |
| G7 | nano-banana-pro | poyo | n=1, default | | |
| G8 | sora-2-vip | apimart | 5s 720p | | |
| G9 | sora-2-preview | apimart | 5s 720p | | |
| G10 | sora-2-pro-preview | apimart | 5s 720p | | |
| G11 | veo3.1-lite | apimart | 5s 720p | | |
| G12 | kling-v3-omni | apimart | 5s 720p | | |
| G13 | kling-video-o1 | apimart | 5s 720p | | |
| G14 | runway-gen-4.5 | poyo | 5s 720p | | |
| G15 | viduq3 | apimart | 5s 720p | | |
| G16 | viduq3-pro | apimart | 5s 720p | | |
| G17 | viduq3-turbo | apimart | 5s 720p | | |
| G18 | viduq3-mix | apimart | 5s 720p | | |

Once filled in, copy the figures into the FULL handoff §14 and update
`MODEL_PROVIDERS` cost annotations if any future caller needs them.

---

## Sign-off

- [ ] Section A complete
- [ ] Section B complete
- [ ] Section C complete
- [ ] Section D complete
- [ ] Section E complete (or flag remains off in prod)
- [ ] Section F complete
- [ ] Section G complete and §14 updated
- [ ] No P0 issues found
- [ ] All P1 issues filed in tracker

QA owner: ____________  Date: ____________
