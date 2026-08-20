# steady — Design Audit

Full-scale visual audit of the steady app against its own design system and the
"warm, cozy, retro, never visually overwhelming" brief. Ground truth was captured
by running the app and inspecting every screen (light + dark, mobile-first) plus
the living styleguide.

## Audit decisions (agreed with the user)

1. **Retro accents on a soft warm base** — pixel tiles / stepped corners / pixel
   shadows / sprite icons are *accents*, not a full 16-bit costume.
2. **Keep the shipped literal pixel jar** as source of truth; the styleguide
   `JarHero` spec was updated to match it.
3. **Audit + implement P0/P1 fixes.**
4. **Light AND dark mode reviewed equally.**
5. **Mobile-first visual pass; desktop secondary** (desktop becomes a priority
   later, so layout work stays desktop-friendly).

## The central finding

The retro pixel skin (4px stepped corners, pixel shadows, parchment cards) was
applied to **containers** (cards, chips, the jar, stepper, segmented control) but
not to **interactive controls** (buttons, inputs, nav pills, data rows), which
stayed fully rounded. That produced a jarring mix — a 4px pixel card containing
9999px rounded-full buttons. The pixel language was also internally inconsistent
(pixel-card = 4px, but the pixel Alert was 10px).

**Resolution (per decision 1):** pixel = containers and accents (4px); controls
stay rounded. This is now enforced consistently.

## P0 — Fixed

- **P0-1 · Unify the pixel language.** `Alert` pixel variant and every jar pixel
  container (state banner, jar well, quick-add card, today's-log container) now
  use 4px `rounded-none` to match `pixel-card`. Interactive rows inside pixel
  cards (today's-log items, settings rows, crisis rows) stay rounded — controls
  are rounded by design.
- **P0-2 · Jar containers to 4px.** Same as above, scoped to `JarScreen`.
- **P0-3 · Favicon rebuilt in terracotta.** `public/favicon.svg` was bloom-pink
  `#f472b6` with a sans-serif "s"; now a brand-500 `#c56a4f` tile with a
  pixel-art jar (walnut lid, honey body, highlight), matching the PWA icons and
  the terracotta brand ramp.

## P1 — Fixed

- **P1-4 · Tokenize hardcoded values.**
  - `duration-150` → `duration-[var(--dur-quick)]` (180ms) in `TextInput`,
    `TextArea`, `Select`, `SegmentedControl`.
  - `ColorPicker` `duration-150` → `duration-[var(--dur-fast)]` (120ms).
  - Modal backdrop `bg-[rgb(40_18_12/0.45)]` → new `--color-overlay` token
    (light `rgb(40 18 12 / 0.45)`, dark `rgb(0 0 0 / 0.6)`), mirrored in
    `tokens.ts`.
  - Button loading spinner `animate-spin` (untokened 1s) → new `--dur-spin`
    (900ms) token, mirrored in `tokens.ts`.
- **P1-5 · Replace native `window.confirm`.** Timeline entry deletion now uses
  the custom confirm `Modal` (Cancel / Delete), matching every other destructive
  action in the app. `window.confirm` is gone from the codebase.
- **P1-6 · Centralize jar state copy.** The three jar states (healthy / low /
  overdrawn) now live in one module `src/features/jar/jarStates.ts`, imported by
  both `JarScreen` and the styleguide `JarHero`. No more duplicated, drifting
  copy.
- **P1-7 · Unify dark-mode implementations.** The styleguide used its own local
  theme state + direct `classList.toggle`; it now uses the shared `useTheme()`
  from `theme.tsx`. One source of truth for light/dark.

## P2 — Backlog (not implemented)

Lower-priority, non-blocking items captured for a future pass:

- **P2-1 · `Select` and `ProgressBar` primitives are built but only appear in the
  styleguide.** Wire them into real screens where they fit (e.g. a jar-size
  picker, a remaining-today progress bar on the jar screen).
- **P2-2 · Jar daily total / reset hour have no editing UI.** `dayTotal` and
  `resetHour` are read from the profile but there's no way to change them
  (`setDayTotal` / `upsertJarDay` are dead code). Add a small settings control.
- **P2-3 · Crisis resources are hardcoded** in `AboutScreen`. The plan wanted a
  switchable config (Canada / UK / Australia / Israel). Extract to a config
  module.
- **P2-4 · Google Fonts `@import` is not precached** by Workbox, so offline mode
  loses Pixelify Sans (falls back to Nunito/system). Consider self-hosting or
  precaching the display font.
- **P2-5 · Styleguide route is reachable in production** (`/styleguide`). Decide
  whether to gate it behind a dev flag.
- **P2-6 · Timeline images use `alt={entry.title}`** — redundant per image.
  Consider a more descriptive alt or `alt=""` for decorative thumbnails.
- **P2-7 · Repo hygiene.** `dev-server.log` (29KB) is committed at root;
  `src/features/tools/` is an empty leftover; `BUILD_PLAN.md` /
  `EXECUTION_STRATEGY.md` describe an outdated state. Clean these up.
- **P2-8 · Profile `theme` field and `'system'` option are defined but unused.**
  Only light/dark are wired. Add system-follow if desired.

## Intentional exceptions

- **`--ease-spring` (cubic-bezier(0.34, 1.4, 0.64, 1))** is flagged by the
  anti-pattern detector as a bounce. It is a deliberate, documented choice: a
  subtle overshoot used *only* for the decorative jar chip pour (600ms), scoped
  to chips. It serves the cozy-retro feel and is not a general-purpose easing.
  Kept as-is.

## Verification

- `npm run typecheck` — clean.
- `npx vitest run` on affected suites (tokens, JarScreen, TimelineScreen, and
  10 other UI files) — all pass.
- Browser-verified: jar screen renders with unified 4px pixel containers;
  styleguide theme toggle drives the shared ThemeProvider; favicon is the
  terracotta pixel jar; timeline delete opens the custom Modal.
- Impeccable anti-pattern detector: no Inter-everything, no purple gradients, no
  nested-card slop, no WCAG violations. Only the intentional spring-easing note.
