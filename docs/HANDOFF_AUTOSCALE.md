# Hand-off: Auto-scale the horizontal timeline to screen size

**To:** coding specialist
**From:** design review
**Branch:** `feature/horizontal-timeline`
**Status:** spec for implementation

## Goal

Make the horizontal timeline's visual elements scale proportionally to the
user's screen size, so it feels right on a small phone held in landscape and on
a large desktop monitor — without breaking the app's design tokens, the 44px
touch-target rule, or the pixel grid.

## Approach: responsive breakpoints (NOT continuous viewport scaling)

Use the existing Tailwind breakpoint system (`sm`/`md`/`lg`) to adjust sizes,
matching how the rest of the app already behaves. Do **not** use continuous
`clamp()`/vw scaling for the core elements — it fights the fixed 44px touch
targets and the pixel grid, and it's not how the rest of steady works.

The one place continuous scaling is acceptable is the **date-proportional
scale** (px-per-day), which already adapts to the data span. Leave that as-is.

## What to change (in `src/features/timeline/TimelineHorizontal.tsx`)

The current constants are tuned for a mid-size desktop. Introduce breakpoint
variants so mobile-landscape and large-desktop get proportionally sized cards,
markers, and spacing.

### 1. Card size (`CARD_W`, `CARD_H`)
- **Mobile / small (`< md`):** `CARD_W` ~ 200px, `CARD_H` ~ 260px (smaller cards
  so more fit on a phone-width track).
- **Desktop (`md`–`lg`):** current values (`CARD_W` 256, `CARD_H` 292).
- **Large desktop (`≥ xl`):** `CARD_W` ~ 300px, `CARD_H` ~ 320px (more generous).

### 2. Track height (`TRACK_BASE_HEIGHT`, `TOP_OFFSET`)
- `TOP_OFFSET` is currently auto-computed as `TRACK_BASE_HEIGHT / 2 + 28`.
  Keep that relationship. Scale `TRACK_BASE_HEIGHT` with the breakpoint so the
  centre line and the two card rows sit proportionally:
  - small: ~300, desktop: 340 (current), large: ~380.

### 3. Compact markers
- Keep the **44px touch target** at every breakpoint (do not shrink below 44px —
  this is a hard a11y rule).
- The marker dot and date label can scale slightly (dot 16px → 18px on large
  desktop) but keep the button ≥ 44px.

### 4. Zone bands, jump-to chips, month ruler
- These already scale with the track width. No change needed beyond inheriting
  the track's breakpoint sizing. Keep the month ruler's `text-xs` labels legible
  at all sizes.

### 5. Spacing
- Use the existing spacing tokens (`gap-*`, `p-*`). Tighter on small, more
  generous on large.

## Constraints (do not break)

- **44px touch targets** on all interactive elements (markers, chips, chevrons,
  buttons) at every breakpoint.
- **Reduced-motion** behavior unchanged (smooth scroll → instant; no new
  animations).
- **Never colour-alone** — zone bands keep their name pills + color dots.
- **Design tokens only** — no new hardcoded colors/radii/shadows. Use the
  existing `--text-*`, `--radius-*`, `--shadow-*`, `--color-*` tokens.
- **Pixel language** — cards/markers/chips stay `rounded-none` (pixel) with
  `shadow-pixel-sm`; controls stay rounded. Don't reintroduce the pixel-vs-
  rounded mix.
- **No data-model changes.** This is presentation-only.

## Acceptance

- On a phone held in landscape, the track, cards, and markers look proportionally
  sized (not cramped, not overflowing).
- On a large desktop, the same data looks comfortably larger.
- All existing timeline tests still pass (`npx vitest run
  src/features/timeline/TimelineScreen.test.tsx`).
- `npm run typecheck` clean.
- No horizontal overflow, no contrast regressions.
