# steady — Design Optimization Plan

> Full-scale design audit + prioritized execution plan for the **cutesy-pixel-retro vibe that is also not visually overwhelming**.
> Status: **Phases 1–3 complete (verified)** · Last updated: 2026-08-20
> Branch: `design/pixel-polish-phase2` (Phase 1 was done on `main`; Phase 2+ moved to this branch). Changes uncommitted.

---

## 1. Health Score (baseline)

| Dimension | Score | Notes |
|---|---|---|
| Accessibility | 3/4 | One real AA failure (P1-6); everything else solid |
| Performance | 4/4 | Motion transform-scoped, reduced-motion kill-switch, no jank |
| Theming | 4/4 | Light+dark fully mirrored; only pure-white leak is Toggle (P1-5) |
| Responsive | 3/4 | Mobile-first, but jar + timeline stack chrome on narrow |
| Implementation Integrity | 3/4 | Tokenized, but ad-hoc radii/geometry + 3 divergent chart dialects |
| **Total** | **17/20 — Good** | Target after fixes: **18–19** |

**Post-fix estimate (Phases 1–3 applied):** Accessibility 3→4 (AA failures fixed, focus ring added), Implementation Integrity 3→4 (pixel language unified, ad-hoc radii/geometry removed). **Estimated 18–19/20.**

**Design identity (confirmed):** "pixel frame, rounded guts" — pixel containers/accents at 4px, controls stay rounded. This is the agreed, documented strategy (see `docs/DESIGN_AUDIT.md`). **Do not** go full 16-bit costume. Motion is calm and reduced-motion-safe — keep it that way.

---

## 2. Headline Finding

**The Jar screen violates the "never visually overwhelming" brief.** A single `pixel-card` stacks **7 regions** (header+segmented control, state banner, jar well + 3 ledger chips, quick-add, today's log, last-7-days chart, pattern bars) on top of app chrome (sticky header + guest banner). ~4 accent families (honey/walnut/parchment/brand-rose) + sprite icons in nearly every row. Most crowded screen in the app — and the one a dysregulated reader is most likely to open.

Everything else is manageable: hub calm (4 cards), settings excellent, timeline busy-but-managed.

---

## 3. Findings by Severity

### P0 — Blocking
- **P0-1 · Jar screen density** (`JarScreen.tsx:304-589`). 7 stacked regions + 4 accent families + sprite icons everywhere. Biggest risk to the brief. *(Verified live.)*

### P1 — Major
- **P1-1 · Jar vessel isn't pixel-true** (`JarScreen.tsx:56-60`). **Verified live:** lid `rounded-t-sm` (10px), body `rounded-t-sm rounded-b-[6px]` (10px top / **6px ad-hoc bottom**), neck `rounded-none`, plus hardcoded `border-[3px]`, `h-44 w-32`, `h-3 w-20`. Three corner vocabularies on the centerpiece. → 4px (`--radius-pixel`) + tokenized border.
- **P1-2 · Primary action buried** (`JarScreen.tsx:394-451`). "Log a spoonful" uses the *same* `border-2 border-line rounded-none` container as the two passive panels. No hierarchy. State banner + segmented control + ledger chips compete for first attention over the jar.
- **P1-3 · State banner out-competes the jar** (`JarScreen.tsx:331-348`). Full-width 2px-bordered panel under the header is heavier than the jar.
- **P1-4 · Same data-viz, three dialects.** "Last 7 days" + "Where your spoons went" bars differ across `JarScreen` (pixel) vs `JarHero` (rounded): `rounded-t-none border-2 border-b-0` vs `rounded-none border` vs `rounded-t-md`/`rounded-full`. Drift.
- **P1-5 · Toggle hardcodes pure white** (`Toggle.tsx:43`). `bg-white` is the only pure white in the palette (no `--color-white` token; nearest `surface #fffdfa`). → `bg-surface`. *(Not currently rendered on settings — theme uses radios — but a latent primitive defect.)*
- **P1-6 · `text-ink-faint` fails AA on timeline** (`TimelineHorizontal.tsx:303`). `#99837a` = 3.32:1 on canvas, ~2.8:1 over colored zone bands — below 4.5:1 for essential date labels. `ink-faint` is documented "non-essential only." → `text-ink-soft`.

### P2 — Minor
- **P2-1 · Dual burst animations per log** (`JarScreen.tsx:93-108` + `:421-436`). Two simultaneous upward bursts on one tap.
- **P2-2 · Ledger chips noisy under jar** (`JarScreen.tsx:365-385`). Three `pixel-chip` stats with 2px borders + shadows right under the hero jar.
- **P2-3 · Off-token 3px radii** (`TimelineHorizontal.tsx:242,281,319`). `rounded-[3px]` vs `--radius-pixel` 4px.
- **P2-4 · Duplicated brand tile+heading on Timeline** (`TimelineScreen.tsx:659` + `:678`). Same pixel-tile+icon+title ~40px apart.
- **P2-5 · Wall of chrome on Timeline** — 4 stacked control/legend rows before any data on narrow.
- **P2-6 · Button accent shade mismatch** — `bg-brand-600` (Button) vs `bg-brand-700` (IconButton/Chip), same intent.
- **P2-7 · Modal is least pixel-consistent surface** (`Modal.tsx:103,112`). `rounded-2xl` + `shadow-pop` + `backdrop-blur-[2px]`, no pixel variant — feels like a different app.
- **P2-8 · IconButton pixel prop doesn't affect corners** — pin/reorder buttons stay `rounded-xl` inside pixel cards while "Open" gets `pixel-btn`. Incoherent within one card.
- **P2-9 · Accent step inconsistency** — jar tile `text-jar-700` vs bloom `text-bloom-600`.

### P3 — Polish
- Duplicate explanatory copy on jar quick-add; borrowed note duplicates banner; edit-mode Save rounded vs quick-add pixel-btn; `LedgerStat` "spent" value `text-ink-soft`; scroller `rounded-xl` vs pixel siblings; photo thumbnails `rounded-lg` vs `rounded-md`; `backdrop-blur` only blur in app; Select lacks pixel prop; vertical spine dot `rounded-full` vs horizontal `rounded-[3px]`.

---

## 4. Execution Plan

### Phase 1 — Foundation (2 parallel subagents)

**✅ DONE (2026-08-20).** Both workstreams completed; `npm test` (130 passed, 24 skipped) + `npm run typecheck` green. Changes verified live in DOM.

**Workstream A — Jar screen de-clutter (headline fix).** ✅
- Split mega-card: primary `pixel-card` (header, state banner, jar well, quick-add, today's log) + quieter secondary `Card variant="soft"` (history/patterns).
- State banner de-emphasized: `border-2 p-4` → `rounded-lg border p-3` (1px hairline), kept `role="status"` live region.
- Quick-add given distinct weight: `border-line-strong bg-surface shadow-pixel-sm` (verified live).
- Ledger chips quieted: dropped `pixel-chip` 2px-border+shadow → quiet inline `rounded-lg` tinted stats.
- Trimmed dual burst: removed `buttonBurst`; only jar-mouth burst remains.
- Only file touched: `src/features/jar/JarScreen.tsx`.

**Workstream B — Pixel-language consistency pass.** ✅
1. Jar vessel → true 4px corners (`rounded-none rounded-b-[var(--radius-pixel)]`, verified live `0px 0px 4px 4px`); kept `border-[3px]` literal (<4× use, no token exists).
2. Unified 3 chart dialects onto stepped-pixel style (`JarScreen` + `JarHero`).
3. `Toggle.tsx:43` `bg-white` → `bg-surface`.
4. `TimelineHorizontal.tsx:242,281,319` `rounded-[3px]` → `rounded-[var(--radius-pixel)]`.
5. Accent aligned to `bg-brand-600` (IconButton + Chip updated; Button already 600).
6. `Modal` gained optional `pixel` prop (pixel corners + shadow; default unchanged).
7. IconButton `pixel` now affects corners (`rounded-[var(--radius-pixel)]`); `round` still forces `rounded-full`.
8. Tile accent steps aligned to `-700` (tools.config.ts + HubHero).
- Files: `JarScreen.tsx`, `JarHero.tsx`, `Toggle.tsx`, `TimelineHorizontal.tsx`, `IconButton.tsx`, `Chip.tsx`, `Modal.tsx`, `tools.config.ts`, `HubHero.tsx`.

### Phase 2 — Surfaces (2 parallel subagents, after A/B land)

**✅ DONE (2026-08-20).** Both workstreams completed; `npm test` (130 passed, 24 skipped) + `npm run typecheck` green.

**Workstream C — Timeline + Settings polish.** ✅
- `TimelineHorizontal.tsx:303` `text-ink-faint` → `text-ink-soft` (fixes WCAG AA failure). Other `ink-faint` (hover chevron, decorative) kept.
- Removed duplicate brand tile from page header (`TimelineScreen.tsx:659`); card header keeps the single tile + "My timeline". Page h1 preserved.
- Collapsed chrome rows: "Add zone" moved into header action cluster; zone legend only renders when zones exist (4 bands → 3 on narrow).
- Photo thumbnails `rounded-md` → `rounded-lg` (unified with vertical list).
- Vertical spine dot `rounded-full` → `rounded-[var(--radius-pixel)]` (aligned with horizontal markers).
- Tightened horizontal track top padding.

**Workstream D — Accessibility + contrast hardening.** ✅
- Only code change: `SegmentedControl.tsx` added `focus-within:ring-2 ring-focus ring-inset` (sr-only radios had no visible focus indicator).
- All `text-ink-faint` usages in scope verified non-essential (decorative/disabled/placeholder/dev-only) — all kept.
- Accent text on tinted tiles verified AA (all ≥4.5:1: jar-700/jar-100 6.57:1, brand-700/brand-100 8.41:1, bloom-700/bloom-100 9.27:1, timeline-700/timeline-100 6.35:1).
- Status affordances confirmed never color-alone. Reduced-motion kill-switch covers all motion. No `bg-white` leak remains.

### Phase 3 — Verify

**✅ DONE (2026-08-20).**
- Impeccable detector run on all changed files → **1 warning only**: `TimelineHorizontal.tsx:277` "side-tab accent border" (3px solid colored left border on zone bands). **Determined a false positive** — it's a functional timeline zone-boundary marker in a data viz (tint is 20% alpha, so the solid border is the zone's color anchor), not decorative AI slop. Left as-is.
- `npm test` → 130 passed, 24 skipped. `npm run typecheck` → clean.
- Live DOM verification: jar screen now 1 pixel-card + quieter soft secondary section; quick-add emphasized (`border-line-strong`); jar vessel 4px corners; live region preserved; dark mode renders warm-dark correctly.

---

## 5. Deliberately NOT Changing
- The pixel/rounded split itself (right call, documented).
- Settings screen (excellent — leave it).
- Motion system (calm, transform-scoped, reduced-motion-safe) — only trim dual burst (P2-1).
- The hub (calm + harmonious) — only minor accent-step + IconButton corner fixes.

---

## 6. Verification Notes
- Screenshots couldn't be rendered to model vision (no image input); audit ground-truthed via live DOM inspection (jar vessel geometry, 7-region jar stack, settings layout, hub structure). All subagent findings code-cited (file:line).
