# StudioX Video Model Surface - 2026-04-18

This file supersedes older wizard-era assumptions when deciding what the
current public Studio and Telegram video model menus should expose.

## Source of truth

The active public Studio web surface is defined in:

- `lib/model-config.ts`
  - `VIDEO_MODELS`
  - `VIDEO_MODEL_PRIORITY`
  - `VIDEO_MODEL_LIST`

The UI should treat `VIDEO_MODEL_PRIORITY` as the exact customer-facing
keep-list and order. Telegram should mirror this list instead of carrying
older button sets that still include removed or legacy-only models.

## Current public video model order

1. `sora-2`
2. `sora-2-pro`
3. `veo3.1-fast`
4. `veo3.1-quality`
5. `kling-3.0/standard`
6. `kling-3.0/pro`
7. `kling-2.6`
8. `grok-vid`
9. `hailuo-2.3`
10. `seedance-2`
11. `seedance-2-fast`
12. `wan2.6-text-to-video`
13. `wan2.6-image-to-video`
14. `doubao-seedance-2.0`
15. `veo3.1-lite`
16. `veo3.1-fast-official`
17. `veo3.1-quality-official`
18. `doubao-seedance-2.0-face`
19. `kling-v3-omni`
20. `kling-video-o1`
21. `doubao-seedance-2.0-fast-face`
22. `MiniMax-Hailuo-2.3-Fast`
23. `wan2.6-video-to-video`
24. `wan2.6-i2v-flash`
25. `runway-gen-4.5`

## Legacy Telegram-only entries that should not be treated as current web truth

These were observed in stale Telegram screenshots or older QA docs, but are
not part of the current public Studio web keep-list:

- `sora-2-official`
- `hailuo-02`
- `hailuo-02-pro`
- `seedance-1.0-pro`
- `seedance-1.5-pro`
- `kling-2.1/standard`
- `kling-2.1/pro`
- `kling-2.5-turbo-pro`
- `wan-animate-move`
- `wan-animate-replace`

If these still appear in Telegram, that is a bot-menu parity bug rather than
the current web source of truth.

## Live routing notes that override older assumptions

### Sora

- `sora-2`
  - Current live route: ApiMart primary
  - Reason: live Poyo submit probes returned `404 model not found` for this
    account on 2026-04-18, while ApiMart remains the only active route even
    though it may still hit capacity.
- `sora-2-pro`
  - Current live route: Poyo primary
- `sora-2-official`
  - Current live route: Poyo only
  - Current product surface: not exposed in the web keep-list above

### Seedance naming

- `seedance-2` is the current cross-provider concept shown in the product.
- `doubao-seedance-2.0` is ApiMart's native wire-name variant.
- Poyo does not accept the literal model ID `doubao-seedance-2.0`, so that
  exposed canonical ID remains ApiMart-primary.

## Release guidance

When checking parity between Studio web and Telegram:

1. Start from `VIDEO_MODEL_PRIORITY`
2. Treat any Telegram-only extras as legacy until intentionally reintroduced
3. Do not assume older QA matrix rows are the current product keep-list
