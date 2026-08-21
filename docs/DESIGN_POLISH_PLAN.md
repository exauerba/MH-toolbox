# steady — Design Polish Plan (2026-08-21)

Full-scale design audit → execution plan. Companion to `DESIGN_AUDIT.md` (P0-1..P1-7, shipped) and
`DESIGN_OPTIMIZATION_PLAN.md` (Phases 1–3, shipped 2026-08-20). This pass fixes the remaining
cross-cutting issues found by a programmatic DOM/computed-style audit (all 6 routes × light/dark ×
desktop/mobile), Lighthouse, and the impeccable detector.

**Design identity (locked, do not regress):** "pixel frame, rounded guts" — pixel containers/accents
at 4px (`--radius-pixel`), controls stay rounded. Warm pastel palette, Fredoka body + Pixelify Sans
display (self-hosted, PWA-precached). Motion tokens only (`--dur-*` / `--ease-*`), reduced-motion
kill-switch preserved.

**Audit method note:** this session's model cannot view screenshots, so every finding below was
verified via computed styles, DOM inspection, Lighthouse, and source. No visual guesswork.

---

## Status — COMPLETE (2026-08-21, branch `design/polish-pass-2026-08-21`)

| Phase | Status | Commit |
|---|---|---|
| 0 — Branch + baseline | ✅ | `172aa4c` |
| 1 — P0 bugs | ✅ | `79dcbe8` |
| 2 — Header merge | ✅ | `8a562ac` |
| 3 — Heading scale | ✅ | `ae4e24e` |
| 4 — Vocabulary mixing | ✅ | `13d5fa3` |
| 5 — text-ink-faint | ✅ | `58c7588` |
| 6 — DRY (subagent) | ✅ | `380a0ae` |
| 7 — Brand assets | ✅ | `74c28f3` |
| 8 — Verification | ✅ | — (no code changes) |

**Verification results (Phase 8):** typecheck clean · vitest 135 passed / 24 skipped ·
Playwright e2e 27 passed · lint 0 errors (4 pre-existing warnings) · Lighthouse hub/jar/about
A11y 100 / BP 100 / SEO 100, jar CLS **0** (was 0.5) · impeccable detect: 0 new warnings
(zone edge-band documented as intentional) · live DOM harness confirms all acceptance criteria.

**Implementation notes vs. plan:**
- P0-1 fixed via `--pixel-bg` / `--pixel-border` CSS custom-property modifiers on `.pixel-card`
  (`.pixel-card-warning`) rather than removing `!important` — removing it wholesale would break
  every pixel-card (Card's own `rounded-xl`/`bg-surface` utilities would win). The modifier
  approach keeps the pixel classes intact and lets tints re-resolve in dark mode automatically.
- P0-2 fixed by splitting Chip tone classes into `toneLight`/`toneDark` maps + a `dark` prop
  (default true); the jar state banner chip passes `dark={false}` (its panel stays light-honey
  in dark by design). Ratio now 6.57:1 in both themes.
- P0-3: removed the `ready` gate entirely — the full card renders immediately with default
  values, the Dexie effect fills real data. Same pattern applied to the timeline card
  (loading placeholder now sits *inside* the always-rendered card, `min-h-64`).
- Phase 3: timeline card title `h3`→`h2` at `text-lg`; jar/timeline h1s → `text-3xl`.
- Phase 6: `Tile` primitive gained an `xl` size (64px) to preserve EmptyState's hero tile;
  hub cards now render `tool.description` (tagline retired from app code); `filled` no-op
  audit found zero silent usages.
- Phase 7: `asset_generate_og_image`'s default output was off-brand (slate/cyan/system-ui),
  so the OG image was hand-authored as `public/og.svg` (warm palette, pixel-frame card, leaf
  tile, Pixelify wordmark) and rendered to `public/og.png` (1200×630) via resvg-js. Favicon
  untouched per user preference.

---

## Findings summary

### P0 — real bugs
| # | Finding | Location |
|---|---|---|
| P0-1 | Crisis card loses warning tint: `.pixel-card` `!important` (parchment bg / line-strong border) overrides `bg-warning-soft` / `border-warning-line`. Defeats "crisis section easy to find" (QA.md). Both themes. | `src/index.css` `.pixel-card` (~:359) + `src/features/about/AboutScreen.tsx:42` |
| P0-2 | "Plenty left" chip contrast 1.47:1 — `text-jar-500` on `bg-jar-50`. Violates styleguide rule "jar-500 fills never carry text". Both themes. | `src/features/jar/JarScreen.tsx` state banner |
| P0-3 | Jar page CLS 0.5 (main frame 0.247): small "Loading…" card swaps to full content card after Dexie load. | `src/features/jar/JarScreen.tsx:290-299` (loading branch), `:167` `ready`, `:178-196` load effect |
| P0-4 | No meta-description → SEO 90 on every route. | `index.html` |

### P1 — consistency
| # | Finding | Location |
|---|---|---|
| P1-1 | Two h1 scales: hub/settings/about 32px (`text-3xl`), jar/timeline 20px (`text-xl`). Header wordmark also 20px → brand competes with jar/timeline titles. | Header.tsx:47, JarScreen.tsx:285, TimelineScreen.tsx:657 |
| P1-2 | Timeline H1 "Personal Timeline" and H3 "My timeline" identical (20px Pixelify 700); H1→H3 skip (no H2). | TimelineScreen.tsx:657, :671 |
| P1-3 | Section-header split: hub/jar/timeline `text-sm font-extrabold uppercase tracking-wide`; settings/about card titles `text-lg` plain. (Analysis: settings/about H2s are *card titles* — same role as jar's "Today's jar" 18px. Only timeline's card title is off-scale at 20px.) | SettingsScreen.tsx:27,53; AboutScreen.tsx |
| P1-4 | Pixel-vs-rounded mixing on large content surfaces (not controls): About resource rows `rounded-xl`+`shadow-soft` inside pixel card; timeline track `rounded-xl`; jar ledger pills `rounded-lg` inside pixel panel; thumbnails `rounded-lg` inside pixel cards. | AboutScreen.tsx:68, TimelineHorizontal.tsx:261, JarScreen.tsx:144, TimelineScreen.tsx:248/309/838, TimelineHorizontal.tsx:388/392 |
| P1-5 | `text-ink-faint` (3.32:1, fails AA normal) on visible affordances: footer tagline, grip icon, hover-only chevrons. | Shell.tsx:34, HubHome.tsx:88, TimelineHorizontal.tsx:359 |
| P1-6 | Dead class noise: buttons carry both `text-ink-faint` and `text-ink` (faint silently loses). | HubHome "Open", TimelineScreen "Add entry"/"Add zone"/"Add your first entry" |

### P2 — structure / DRY
| # | Finding | Location |
|---|---|---|
| P2-1 | Header is 125px (brand row h-16 + nav row border-t py-2) at all widths; nav pills `rounded-full` against pixel brand tile; no active-state bg on nav links. | Header.tsx |
| P2-2 | Accent-tile markup copy-pasted ~7× despite `accentTileClass` in tools.config.ts. No `Tile` primitive. | Header:43, HubHome:129, JarScreen:281, TimelineScreen:672, AboutScreen:72, EmptyState:22, HubHero:131 |
| P2-3 | `.pixel-card` `!important` is fragile by design — any tint/border utility on it silently dies (root cause of P0-1). | index.css |
| P2-4 | Duplicated business constants: `<= 3` low-spoon threshold (JarScreen:209 + JarHero:50); `DEFAULT_PINS` vs `pinnedByDefault`; `DEFAULT_PROFILE` replica in TimelineScreen:30-36. | |
| P2-5 | Dead config: `tools.config.ts` `description` field unused (hub renders only tagline); `Icon` `filled` prop silently ignored on all but star/heart. | tools.config.ts:17-18, icons.tsx |
| P2-6 | Detector flag (intentional, document not fix): TimelineHorizontal.tsx:277 `borderLeft: 3px solid` zone edge-band — deliberate data-viz per styleguide spec. | |

### Preserve (do not regress)
Tokenized durations; `--radius-pixel`; never-color-alone jar states; 44px touch targets; terracotta
focus rings (verified working); reduced-motion kill-switch; decorative-by-default icons; A11y 96–100.

---

## Execution phases

### Phase 0 — Branch + baseline
- Create branch `design/polish-pass-2026-08-21` from `main`.
- Commit this plan doc.
- Load impeccable `craft-floor.md` before any UI edit.

### Phase 1 — P0 bugs (small, precise — orchestrator does directly)
1. **P0-1 root fix (P2-3):** move `.pixel-card` / `.pixel-chip` / `.pixel-btn` / `.pixel-tile` / `.dither`
   into `@layer components` in `index.css` so Tailwind utilities (layered) can override them without
   `!important`. Remove the `!important` flags. Verify: AboutScreen crisis card computes
   `bg-warning-soft` + `border-warning-line` in both themes; no other pixel-card regressions
   (re-run DOM harness pixelMix + a visual spot-check of computed styles on hub/jar/settings).
2. **P0-2:** state banner chip `text-jar-500` → `text-jar-700` (styleguide rule). Verify ratio ≥ 4.5.
3. **P0-3:** replace the small "Loading…" card with the full card structure rendered immediately with
   placeholder values (or a same-height skeleton). No swap → no CLS. Verify Lighthouse CLS < 0.1.
4. **P0-4:** add `<meta name="description">` to `index.html` (one line, warm tone). Verify SEO 100.

### Phase 2 — Header merge (design decision — orchestrator)
- Merge nav into the brand row → single sticky bar (~64px). Layout:
  `[leaf tile + "steady"] ··· [nav: Home / Settings / About] [theme toggle]`.
- Nav links: keep `rounded-full` pills (controls stay rounded), add active-state background
  (`bg-surface-strong` or brand tint) + `aria-current` styling; keep 44px touch targets and
  `aria-label="Primary"`.
- Wordmark stays `text-xl` (no longer competes once h1s unify at 32px).
- Verify: header height ~64px on all routes/widths; nav still keyboard-accessible; no overflow at 390px.

### Phase 3 — Heading scale (design decision — orchestrator)
- **All page h1s → `text-3xl` (32px)** (jar/timeline grow; hub/settings/about unchanged).
- **Timeline card title:** `h3` → `h2`, `text-xl` → `text-lg` (18px, matches jar's "Today's jar").
  Outline becomes H1 page → H2 card → H3 "Zones" legend. No more H1/H3 collision.
- **Section headers** stay `text-sm font-extrabold uppercase tracking-wide` everywhere they appear
  (jar/timeline already correct; settings/about card titles are a *different role* — card titles at
  `text-lg` — and stay as-is).
- Verify: heading outline per route (h1→h2→h3, no skips), no two headings share size/weight/font.

### Phase 4 — Vocabulary mixing (judgment calls — orchestrator)
- **About resource rows:** `rounded-xl` + `shadow-soft` → pixel treatment
  (`rounded-[var(--radius-pixel)]` + `shadow-pixel-sm` or `border-2`), matching the pixel frame.
- **Timeline track:** `rounded-xl` → `rounded-[var(--radius-pixel)]` (pixel frame around pixel pills).
- **Jar ledger pills:** `rounded-lg` → `rounded-[var(--radius-pixel)]`.
- **Thumbnails** (timeline photos): `rounded-lg` → `rounded-[var(--radius-pixel)]` for pixel-language
  consistency (photos are content, but the HANDOFF doc bans mixing on surfaces).
- **Nav pills** stay `rounded-full` (controls convention) — no change beyond Phase 2.
- Verify: no `rounded-lg`/`rounded-xl` remains inside a pixel frame except on controls (buttons,
  chips, segmented control, swatches).

### Phase 5 — text-ink-faint (small — orchestrator)
- Footer tagline → `text-ink-soft`. Grip icon → `text-ink-soft`.
- Timeline chevron: always visible at `text-ink-soft` (drop `opacity-0` hover-only reveal) — the
  whole-card-open affordance must be discoverable.
- Strip dead `text-ink-faint` from buttons that also carry `text-ink`.
- Verify: no `text-ink-faint` on interactive/visible affordances; ratio ≥ 4.5 for all normal text.

### Phase 6 — DRY / structure (mechanical — **subagent**, well-specified brief)
Delegate with a precise contract (files, exact class strings, acceptance criteria):
1. **`Tile` primitive** in `src/design/primitives/` — props `{ name: IconName; tone: keyof typeof accentTileClass; size?: 'sm'|'md'|'lg' }`, renders the pixel-tile + accent classes from `tools.config.ts` `accentTileClass`. Replace the ~7 duplicated blocks (Header:43, HubHome:129, JarScreen:281, TimelineScreen:672, AboutScreen:72, EmptyState:22, HubHero:131). Export from primitives index.
2. **Constants dedupe:** shared `LOW_SPOON_THRESHOLD` (JarScreen + JarHero); single `DEFAULT_PINS` source (drop `pinnedByDefault` or derive one from the other); shared `DEFAULT_PROFILE` (TimelineScreen imports instead of replicating).
3. **Dead config:** either render `description` on hub directory cards (preferred — richer cards) or delete the field. Decide: render it (small win, uses existing data).
4. **Icon `filled`:** keep star/heart support; remove `filled` from call sites where it's a no-op.
- Subagent returns a diff summary; orchestrator reviews + runs typecheck/tests.

### Phase 7 — Brand assets (prompt-to-asset MCP — orchestrator drives)
- **Keep current favicon** (user preference).
- Generate **OG image** 1200×630 via `asset_generate_og_image` (Satori, deterministic, zero-key) —
  cutesy pastel retro-pixel vibe, brand palette (terracotta/honey/sage/pink on parchment), title
  "steady". Wire `<meta property="og:*">` + twitter card into `index.html`.
- Optional: hub hero illustration via `asset_generate_illustration` (external_prompt_only or api
  free route) if the hub hero wants art — decide after OG image lands.
- Verify: OG image renders (dimensions 1200×630, palette matches brand), meta tags present.

### Phase 8 — Verification (orchestrator)
- Re-run DOM harness on all 6 routes × light/dark × desktop/mobile: expect zero lowContrast on
  interactive text, zero pixelMix on content surfaces, clean heading outlines, header ~64px.
- Lighthouse: hub/jar/about — expect A11y ≥ 95, BP ≥ 90, SEO 100, CLS < 0.1.
- Re-run impeccable `detect.mjs` over changed files — expect zero new warnings (zone band stays
  documented as intentional).
- `npm run typecheck`, `npm run lint`, `npm run test` (130 pass), `npm run e2e` (27 tests).
- Update `docs/QA.md` if any checklist item changed (crisis card now visibly warning-tinted).

---

## Subagent + tool usage map

| Phase | Executor | Tools / MCPs |
|---|---|---|
| 0 | orchestrator | git |
| 1 | orchestrator | chrome-devtools (verify), Lighthouse |
| 2 | orchestrator | chrome-devtools (verify) |
| 3 | orchestrator | chrome-devtools (verify) |
| 4 | orchestrator | chrome-devtools (verify) |
| 5 | orchestrator | chrome-devtools (verify) |
| 6 | **subagent** (general) | filesystem, grep; orchestrator reviews diff |
| 7 | orchestrator | prompt-to-asset (og_image, free Satori route) |
| 8 | orchestrator | chrome-devtools, Lighthouse, impeccable detect.mjs, npm scripts |

Subagents are used where the work is mechanical and well-specified (Phase 6). Design-judgment
phases (1–5) stay with the orchestrator because they carry the audit context and the locked design
identity. No subagent can view screenshots in this session either, so verification stays
programmatic.

## Acceptance criteria (definition of done)
1. P0-1..P0-4 fixed and verified (computed styles + Lighthouse).
2. Header is a single ~64px bar on all routes/widths; nav has active state.
3. One h1 scale (32px), no heading collisions, clean outlines.
4. No pixel-vs-rounded mixing on content surfaces; controls stay rounded.
5. No `text-ink-faint` on interactive text; all normal text ≥ 4.5:1.
6. Tile primitive + constants deduped; no dead config.
7. OG image + meta tags shipped; favicon untouched.
8. typecheck/lint/test/e2e green; Lighthouse A11y ≥ 95, SEO 100, CLS < 0.1.