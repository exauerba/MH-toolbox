# Steady — Therapeutic Toolbox PWA: Build Plan

**Status:** Approved for build · **Date:** August 15, 2026
**Source:** `therapeutic-toolbox-prd.md` (v1) + decisions from plan-sharpening session.
**Last status update:** August 16, 2026 (see §0).

---

## 0. Current status (updated 2026-08-16)

**HEAD:** `1aac9b9` on `main` — the `wp10-retro-skin` branch is fully merged (merge-base = its tip `1534748`). The retro skin is the current visual state of the app.

**The short version:** the *visual* product is done and merged (WP3 design system + WP10 retro skin). The *functional* product is still preview-stage — the data layer (WP1) does not exist, auth is not wired to any UI, and the Jar/Timeline screens are hardcoded demos.

| WP | Title | Status | Notes |
|----|-------|--------|-------|
| WP0 | Repo scaffold | ✅ merged | Vite+React+TS+Tailwind, ESLint/Prettier, Vitest, Playwright, GH Actions |
| WP1 | Data layer | ❌ not started | **No `src/data/` at all** — the load-bearing abstraction is absent |
| WP2 | Supabase + auth | ⚠️ partial | Migrations + RLS + `authCore`/`lockout` merged; `steady-delete-account` edge function missing; RLS tests red in CI |
| WP3 | Design system | ✅ merged | Tokens, primitives, hero visuals, styleguide, pixel sprites |
| WP4 | App shell | ✅ merged | Shell, header, guest banner, theme, routing |
| WP5 | Hub + pinning | ⚠️ partial | Hub + localStorage pinning work; no drag-reorder (WP11), no Supabase sync |
| WP6 | Energy Jar | ⚠️ preview | `JarScreen` is a hardcoded demo (presets, fake logs/history); no persistence, no `dayForDate` |
| WP7 | bloom hand-off | ✅ merged | Card + same-tab link-out via `tools.config.ts` |
| WP8 | Settings / About | ⚠️ partial | Theme works; Account/Export/Delete are disabled "coming soon"; About has hardcoded US resources, not the config-driven switchable list |
| WP9 | Personal Timeline | ⚠️ preview | `TimelineScreen` renders the hero only; no CRUD/zones/images |
| WP10 | Guest→account migration | ❌ not started | ⚠️ **naming collision:** the merged `wp10-retro-skin` branch is a *skin* pass, not this WP |
| WP11 | Pin drag-to-reorder | ❌ not started | |
| WP12 | Hardening pass | ❌ not started | E2E specs exist (hub/smoke/styleguide) but the full suite doesn't |
| WP13 | Release | ❌ not started | |

**Also missing (not WP-scoped):** PWA (`vite-plugin-pwa` TODO still in `vite.config.ts`), `src/shared/` (day math, strings module), crisis-resources config, auth UI wiring, guest→account migration.

**CI (latest commit `1aac9b9`):** Typecheck / Lint / Unit / Build / E2E / Deploy all green · **RLS security tests red** — the non-negotiable gate (§9).

**Next steps (in order):** ① fix the RLS test failure in CI, ② build WP1 (data layer), ③ wire auth UI + repository swap, ④ replace the Jar/Timeline previews with repository-backed features.

---

## 1. Product snapshot & locked decisions

A single installable PWA — brand name **steady** — acting as a hub for self-guided emotional-regulation and processing tools. Each tool opens as its own screen with its own accent identity; users can **pin** tools to the top of the hub home screen (favoriting, not OS-level install). Ships with **Energy Jar** and **Personal Timeline** as new tools, and a themed link-out to the existing **bloom** mood/symptom tracker. Two storage modes: **guest (local-only)** and **signed-in (Supabase)**. Privacy and visual craft are first-class requirements.

Locked decisions:

| # | Decision | Value |
|---|----------|-------|
| 1 | Build scope | **Phases 1 + 2** (hub/auth/guest/pinning/Energy Jar/tracker link/settings **+** Timeline, guest→account migration, pin drag-reorder). Phase 3 (Advanced Statistics) and Phase 4 are future work. |
| 2 | Brand | **steady**. Auth namespace remains `@bloom.app` (see §4). |
| 3 | Repo / hosting | Public repo `exauerba/MH-toolbox` → GitHub Pages at `https://exauerba.github.io/MH-toolbox/` |
| 4 | Supabase | **One shared project** with bloom (`xxtavjeetzvtlhwoenho`). Hub work is **additive-only**: new `steady_*` tables/policies/functions; bloom's `trackers`/`entries` are never altered, only read (for future stats) under per-user RLS. |
| 5 | Language | English only. Strings centralized in a `strings` module so i18n stays cheap later. |
| 6 | Testing bar | **More**: unit + component coverage, E2E on every tool flow in both modes, a11y (axe, keyboard, reduced-motion), Lighthouse budgets, RLS security tests, no-console-errors assertions — all in CI. See §11. |
| 7 | Design | Design-direction work package owned by the design specialist **after scaffold + data layer prove out**, before feature builds. Per-phase design review checkpoints. See §10. |
| 8 | Auth | Username-based, mirroring bloom: `username` → `username@bloom.app` + password, no email verification. Client-side lockout after 5 failed attempts. |
| 9 | Storage modes | Guest = IndexedDB (Dexie). Signed-in = Supabase (Postgres + Storage). **No offline write-queue in v1** — signed-in tools degrade gracefully offline with a clear message (PRD §9 allows this). |
| 10 | Guest→account | One-time idempotent "import local data" step on first sign-in (Phase 2). |

Operational notes: repo lives in OneDrive — `node_modules` must stay gitignored and is a known sync-conflict hazard; CI runs on GitHub so builds are unaffected. Local dev should use `npm ci` and avoid running dev servers while OneDrive is syncing.

---

## 2. Architecture overview

```
┌─────────────────────────────────────────────────────────┐
│  steady PWA (React 19 + Vite + TS + Tailwind)           │
│  Hash routing → GH Pages-safe deep links                 │
│                                                         │
│  App shell (providers: AuthState, Repository, Theme)    │
│   ├── AuthService (username → @bloom.app, lockout)       │
│   ├── ToolboxRepository (THE interface)                 │
│   │    ├── LocalRepository      → Dexie (IndexedDB)      │
│   │    └── SupabaseRepository   → Supabase Postgres+Storage│
│   └── StorageService (images; Dexie blobs / Storage)     │
│                                                         │
│  Features (each talks ONLY to ToolboxRepository)        │
│   ├── Hub (pinned + directory, config-driven)           │
│   ├── Energy Jar   ── accent identity A                 │
│   ├── Personal Timeline ── accent identity B            │
│   ├── Settings / About                                   │
│   └── bloom link-out card (same-tab hand-off)           │
│                                                         │
│  Design system: tokens (warm palette, type, motion,     │
│  per-tool accents) + shared UI primitives                │
└─────────────────────────────────────────────────────────┘
```

### 2.1 The load-bearing abstraction: `ToolboxRepository`

Every feature reads/writes through one async repository interface returning **domain objects** (never raw Supabase rows or Dexie records). Two implementations swap behind it based on auth state (guest → Local, signed-in → Supabase).

```ts
interface ToolboxRepository {
  // Auth-independent domain operations. All async, all domain types.
  getProfile(): Promise<Profile | null>
  setProfile(p: Profile): Promise<void>
  getPins(): Promise<string[]>                     // ordered tool ids
  setPins(ids: string[]): Promise<void>
  // Energy Jar
  getJarDay(date: string): Promise<JarDay | null>
  upsertJarDay(d: JarDay): Promise<void>
  listJarLogs(): Promise<JarLog[]>                 // full history
  addJarLog(l: JarLogInput): Promise<JarLog>
  updateJarLog(id: string, l: JarLogInput): Promise<void>
  deleteJarLog(id: string): Promise<void>
  // Personal Timeline
  listTimelineEntries(): Promise<TimelineEntry[]>
  saveTimelineEntry(e: TimelineEntryInput): Promise<TimelineEntry>
  deleteTimelineEntry(id: string): Promise<void>
  listZones(): Promise<TimelineZone[]>
  saveZone(z: TimelineZoneInput): Promise<TimelineZone>
  deleteZone(id: string): Promise<void>
  uploadImage(file: File, entryId: string): Promise<ImageRef>
  deleteImage(ref: ImageRef): Promise<void>
  // Account/data
  exportAll(): Promise<ExportBundle>               // JSON payload
  deleteAllData(): Promise<void>                   // wipe current mode's data
}
```

Rules that keep this bug-free and future-proof:
- **Domain types only** across the interface — storage details (snake_case columns, Dexie stores) live inside the implementations. `src/data/types.ts` is the contract; changes to it are the highest-impact changes in the codebase and must be reviewed as such.
- **Both implementations are tested against the same test suite** (table-driven tests running against an in-memory fake, and integration tests against local Supabase for the cloud side). What works in guest mode must work signed-in by construction.
- **Adding a future tool** = new feature folder + a `tools.config.ts` entry + optionally new repository methods. No structural change.

### 2.2 Auth/session consequences of the shared project + shared origin

Supabase stores its auth session in `localStorage` under a key derived from the **project ref** (`sb-xxtavjeetzvtlhwoenho-auth-token`). Bloom and steady are both served from the **same origin** (`exauerba.github.io`) — different paths, same origin — so they **share localStorage**. Consequences:

- A session created by steady is visible to bloom and vice versa. No token hand-off code is needed.
- Bloom deliberately does not auto-login from a stored session ("Always start at the login screen"). So the v1 hand-off is: hub opens bloom in the same tab → bloom's sign-in screen appears → user enters their (shared) username/password → session resolves instantly. No account creation, no second identity. This is the best available approximation without touching bloom's codebase (PRD §6.2 "where feasible").
- **Phase 4 candidate** (only with your blessing): a few-line bloom patch to honor `INITIAL_SESSION` and skip the login screen when a session already exists — makes the hand-off fully seamless.
- Caveat: origin-sharing breaks if either app moves to a custom domain. Not planned; keep in mind.

---

## 3. Tech stack & repo layout

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | React 19 + Vite (latest stable) + TypeScript 5 | Client-heavy PWA; huge ecosystem; fast builds; best subagent tooling |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | Token-driven design system; utility + component layers |
| Routing | react-router v7, **HashRouter** | GH Pages has no SPA fallback; hash routing makes deep links and offline reloads just work |
| PWA | `vite-plugin-pwa` (Workbox) | Manifest + service worker + precached app shell, base-path aware |
| Local storage | Dexie 4 (IndexedDB) | Simple typed API for guest mode |
| Backend | `@supabase/supabase-js` v2 | Auth, Postgres, Storage |
| Testing | Vitest + React Testing Library + user-event; Playwright; axe-core | See §11 |
| Lint/format | ESLint 9 (flat config) + Prettier; `tsc --noEmit` in CI | |
| Charts (future) | Chart.js (same as bloom, keeps phase-3 look consistent) | Phase 3 only |

Repo layout:

```
MH-toolbox/
  docs/BUILD_PLAN.md
  index.html
  vite.config.ts            # base '/MH-toolbox/', pwa config
  playwright.config.ts
  package.json
  src/
    app/                    # providers (Auth, Repository, Theme), router, shell layout
    auth/                   # AuthService + hooks (username scheme, lockout)
    data/
      types.ts              # DOMAIN TYPES (the contract)
      repository.ts         # ToolboxRepository interface
      local/                # Dexie schema + LocalRepository + local storage service
      supabase/             # SupabaseRepository + client factory + remote storage service
      migrateLocal.ts       # guest→account one-time import
    design/                 # tokens.css, UI primitives, icon set
    features/
      hub/                  # home: Pinned section + directory, pin controls
      jar/                  # Energy Jar
      timeline/             # Personal Timeline
      settings/             # Settings + About/resources
    tools/
      tools.config.ts       # DATA-DRIVEN tool directory
    shared/                 # day-window math, date fmt, validation, strings (en)
  supabase/
    migrations/             # steady_* SQL (additive-only)
    functions/steady-delete-account/
  e2e/                      # Playwright specs
  .github/workflows/        # ci.yml, deploy.yml
```

---

## 4. Auth & account model

- **Username auth** mirroring bloom: `USERNAME_RE = /^[a-zA-Z0-9.-]+$/`, `username.toLowerCase() + '@bloom.app'` as the Supabase email. Same namespace as bloom → **one identity across the toolbox**. A bloom user's username works on steady; a steady username works on bloom.
- Generic error messages (never reveal whether a username exists). Client-side lockout: 5 failed attempts → 60 s pause (mirrors bloom's proven pattern; Supabase CAPTCHA is the future hardening).
- **Session source of truth**: `AuthService` wraps `onAuthStateChange`; on sign-in the `RepositoryProvider` swaps Local → Supabase repository. On sign-out it swaps back to Local (pre-existing local data, if any, remains visible).
- **Delete semantics (decision to confirm, see §14):** shared identity means deleting the auth user would destroy bloom access too. Recommended: steady's "Delete all steady data" hard-deletes all `steady_*` rows + storage objects, signs out, and explains that the shared account and bloom data are untouched (bloom has its own delete for that). This honors the privacy promise without nuking the shared identity.

---

## 5. Data model (Supabase, additive-only) & Dexie mirror

All tables: `user_id uuid references auth.users(id)`, RLS enabled, `using (user_id = auth.uid())` for select/insert/update/delete. Client-generated UUIDs; upserts on `user_id`+id (same pattern bloom already uses successfully).

### `steady_profiles` (one row per user)
`user_id` PK · `created_at` · `updated_at` · `theme` (text: light|dark|system) · `jar_default_spoons` (int, default 12) · `jar_reset_hour` (int, default 0) · `onboarding_done` (bool) · `local_data_imported_at` (timestamptz, null)

### `steady_pins`
`user_id` · `tool_id` (text) · `position` (int) · `created_at` — PK (user_id, tool_id). Ordered pin list. Guest pins live in Dexie `pins` store (same shape).

### `steady_jar_days`
`user_id` · `date` (date) · `total_spoons` (int) · `created_at` · `updated_at` — PK (user_id, date). The per-day capacity, editable.

### `steady_jar_logs`
`user_id` · `id` (uuid) · `date` (date) · `spent` (numeric, 0.5 steps) · `label` (text ≤ 40, null) · `created_at` · `updated_at`. Day-window attribution: `date` computed **at write time** from local time + the current reset-hour setting (see §6). Full timestamp retained in `created_at` for future re-derivation.

### `steady_timeline_entries`
`user_id` · `id` (uuid) · `title` (text ≤ 80) · `start_date` (date) · `end_date` (date, null) · `description` (text) · `color` (text hex) · `created_at` · `updated_at`. Ordering = `start_date, created_at` (editing the date = "reordering"; an explicit `sort_order` is a later add if manual ordering is ever wanted).

### `steady_timeline_zones`
`user_id` · `id` (uuid) · `name` (text ≤ 40) · `color` (text hex) · `start_date` (date) · `end_date` (date, null = ongoing) · `created_at` · `updated_at`. User-defined labels/colors (never a fixed clinical set).

### `steady_timeline_images`
`user_id` · `id` (uuid) · `entry_id` (uuid → steady_timeline_entries.id) · `storage_path` (text) · `created_at`. Child of an entry; enforces the ≤5-images-per-entry limit relationally.

### Storage
Bucket `steady-media`, **private**, object path `{user_id}/{entry_id}/{uuid}{ext}`. RLS on storage.objects scoped to owner. Limits: images only, jpeg/png/webp, ≤ 5 MB each, ≤ 5 per entry, per-user quota ≈ 100 MB (checked client-side + enforced in the delete/signup path; document in About).

### Crisis resources config
One typed config, `crisisResources.config.ts`. **Default region: US (988)**; switchable in Settings → About (persisted to profile / Dexie for guests). Selection is explicit, never IP-derived. Regions:

| Region | Hotline | Number |
|--------|---------|--------|
| US (default) | 988 Suicide & Crisis Lifeline | 988 |
| Canada | 988 Suicide Crisis Helpline | 988 |
| UK | Samaritans | 116 123 |
| Australia | Lifeline | 13 11 14 |
| Israel | ERAN | 1201 |

Each entry also carries a one-line region-appropriate disclaimer; adding a region later is a one-line config change.

### Dexie mirror (guest mode)
Stores: `profiles`, `pins`, `jarDays`, `jarLogs`, `timelineEntries`, `timelineZones`, `images` (metadata + Blob in Dexie), keyed by the same ids. Same domain types — only the backend differs.

### Migrations
SQL in `supabase/migrations/` with timestamps, applied to a **preview branch** first, verified (including RLS security tests), then promoted. Never modify bloom's `trackers`/`entries`.

---

## 6. Feature specifications (v1 scope)

### 6.1 Hub shell & directory
- App shell: header (steady wordmark), nav (Home / Settings / About), guest-mode banner ("Using locally on this device — sign in to back this up"), offline banner, first-launch onboarding explainer (plain-language: what guest vs signed-in means for their data — required by PRD §8; lightweight panel, dismissible, low cognitive load).
- `tools.config.ts` drives the directory: `{ id, name, tagline, description, accentToken, icon, route, externalUrl?, pinnedByDefault, component }`.
- Hub home: **Pinned** section (ordered, up top) + **full directory** below. Pin/unpin via a star control on each card. New users pre-pinned: Energy Jar + bloom. Pin state persisted via repository (`steady_pins` / Dexie).

### 6.2 bloom hand-off
- Card for bloom (accent = bloom pink) with "Open" → opens `https://exauerba.github.io/pink-mood-tracker/` **in the same tab** (`target="_self"`) for the least jarring transition; same-tab back-button returns to steady.
- Theme continuity: bloom's tokens (Nunito, pastel pink `#f472b6` on `#fff5f7`) inform steady's design system so the hand-off doesn't feel like leaving the product.
- Shared-origin session means no second account (see §2.2).
- **Stretch (not v1):** "last check-in" teaser by reading bloom's `entries` (read-only, per-user RLS). Optional later; excluded to keep v1 bug-free.

### 6.3 Energy Jar
- Daily jar: total spoons (default 12, editable per day), configured via profile defaults; **reset hour** (default 0) determines when a new day starts; day computed at write time from local time (function `dayForDate(d, resetHour)`, heavily unit-tested incl. DST/edge cases).
- Quick-add: stepper (0.5-step increments) + optional free-text label (≤ 40 chars) + one-tap "Log". Bare-minimum log well under 10 seconds. Edit/delete any log entry.
- Visualization: chips move from "available" to "spent" in real time; three states — healthy (calm), low (gentle color shift, **not** an alarm), overdrawn (supportive copy: "you've used more than today's jar — that's information, not failure"). Must read at a glance; no math. Reduced-motion variant of the fill animation.
- History: day-by-day list of totals + labels; simple pattern view (sum spent by label, e.g. "social events cost the most").

### 6.4 Personal Timeline
- Entries: title, date (optional end date for periods), description, assigned color, optional images (≤ 5, limits per §5). CRUD.
- Zones: user-defined bands (name, color, start, optional end) rendered as a background strip across their date range. No fixed clinical set.
- View: vertical scrollable timeline; entries plotted by date; zones as colored bands; images inline. Warm, non-clinical rendering.
- Privacy: no default sharing anywhere; covered by the same export/delete guarantees.

### 6.5 Settings / About
- Account: sign in / sign up / sign out; guest banner.
- Data: export (JSON full bundle + CSV for jar/timeline), delete all steady data (see §4 delete semantics).
- Appearance: theme light/dark/system (default light, warm).
- About/Resources: disclaimers (not therapy, not crisis support), plain-language privacy explanation, crisis-resources config list (default: US 988; switchable to Canada, UK, Australia, or Israel — see §5 "Crisis resources config").

### 6.6 Guest → account migration (Phase 2)
- On first sign-in while local data exists: modal "Import your local data?" → copies Dexie → Supabase (jar days/logs, timeline entries/zones, images re-uploaded to Storage) → sets `local_data_imported_at` → switches to Supabase repository. Idempotent (cannot double-import). Local copy is retained as a backup; "clear local data" remains available in Settings.

### 6.7 Pin drag-to-reorder (Phase 2)
- Pinned section supports drag-to-reorder (plus up/down buttons for accessibility); order persisted via repository.

---

## 7. Design system (owned by design specialist)

Deliverables of the design-direction WP:
1. **Tokens**: warm, calm color palette (never clinical/cold) with full contrast pairs; typography (Nunito continuity from bloom recommended); spacing/radii/shadows; **motion tokens** (durations/easings) + reduced-motion behavior.
2. **Per-tool accent identities**: steady hub, bloom (pink, existing), Energy Jar, Personal Timeline — each distinct so the app never feels like "one gray app."
3. **UI primitives**: Button, Card, Icon set, Input/Select/Textarea, Modal/Sheet, Toast, Stepper, Toggle, SegmentedControl, EmptyState, Banner.
4. **Hero visuals** (the parts users look at repeatedly — must be designed, not improvised): **Energy Jar** jar/chip rendering incl. low/overdrawn states + reduced-motion; **Timeline** zone-band + entry rendering; hub tool cards.
5. A living styleguide (Storybook or a hidden `/styleguide` route) so feature agents and reviews have a single reference.

Constraints: WCAG 2.1 AA contrast; never color-alone (states carry icon/text); large touch targets; calm, low-stimulation default motion. The design specialist should read bloom's `styles.css`/`palettes.js` as the starting reference for brand continuity.

---

## 8. GitHub Pages & PWA specifics

- Vite `base: '/MH-toolbox/'`; all asset references relative.
- **HashRouter** everywhere → deep links (`/#/tools/jar`) survive reload and work on GH Pages with zero 404 handling.
- `vite-plugin-pwa`: manifest (`name: "steady"`, theme colors from tokens), Workbox precache of the app shell, runtime strategy: navigation fallback to shell; **Supabase API calls network-only** (data integrity); images from Storage network-first. SW revisioned for cache-busting.
- Offline: shell + static assets available; signed-in tool writes degrade to a clear offline banner (no write queue in v1 — deliberate scope cut, documented as future work).
- Deploy workflow: `actions/deploy-pages` from the built artifact on `main`.

---

## 9. CI/CD

- **ci.yml** (PRs + push to main): `tsc --noEmit` → ESLint → Vitest (unit + component + RLS security tests against local Supabase via `supabase start`, seeded test users) → Playwright E2E (local Supabase in CI; Docker available on ubuntu runners) → axe scan → Lighthouse budgets → no-console-errors assertion (E2E).
- **deploy.yml** (main merge): build → upload-pages-artifact → deploy-pages.
- **Security tests** (part of unit suite, run against local Supabase): user A cannot read/write user B's `steady_*` rows; anon cannot read anything; storage objects are owner-scoped. Any regression here fails CI — non-negotiable for a mental-health-adjacent product.

---

## 10. Work packages (subagent-executable)

Each WP is self-contained with explicit files, contracts, tests, and Definition of Done. Dependencies are listed; WPs on the same "wave" can run in parallel on separate branches.

| WP | Title | Contents | Depends on | Wave | Status |
|----|-------|----------|------------|------|--------|
| WP0 | Repo scaffold | Vite+React+TS+Tailwind, hash router, PWA plugin, ESLint/Prettier, Vitest+Playwright wiring, GH Actions ci/deploy, `.gitignore` (node_modules), README stub | — | 1 | ✅ merged |
| WP1 | Data layer | Domain types (`data/types.ts`), `ToolboxRepository`, Dexie schema + LocalRepository, SupabaseRepository, StorageService, `migrateLocal`, unit tests (fake backend + table-driven both-impl suite) | WP0 | 1 | ❌ not started |
| WP2 | Supabase migrations + auth + delete fn | `steady_*` SQL, RLS, `steady-media` bucket + policies, username auth service + lockout, `steady-delete-account` edge function, local dev setup (`supabase/` config + seed) | WP0 | 1 | ⚠️ partial (no delete fn) |
| WP3 | Design system | Tokens, primitives, per-tool accents, jar + timeline hero visuals, styleguide, reduced-motion, bloom-token reference | WP0 (can proceed while WP1–2 finish) | 1 | ✅ merged |
| WP4 | App shell | Providers (Auth/Repository/Theme), routing, header/nav, guest banner, offline banner, first-launch onboarding explainer | WP1, WP2, WP3 | 2 | ✅ merged |
| WP5 | Hub home + pinning | `tools.config.ts`, Pinned section + directory, pin/unpin + persistence, pre-pin defaults | WP1, WP3, WP4 | 2 | ⚠️ partial (localStorage only) |
| WP6 | Energy Jar | Jar math (`dayForDate`, states), quick-add, visualization (chips, low/overdrawn, reduced-motion), history, edit/delete | WP1, WP3, WP5 | 2 | ⚠️ preview (demo data) |
| WP7 | bloom hand-off | Card (bloom accent), same-tab link-out, URL config, hand-off copy | WP3, WP4 | 2 | ✅ merged |
| WP8 | Settings / About | Account, export (JSON/CSV), delete data, theme toggle, about/crisis resources, privacy copy | WP1, WP4 | 2 | ⚠️ partial (theme only) |
| WP9 | Personal Timeline | Entries CRUD, zones, vertical timeline view, images (Dexie blobs / Storage), edit flows | WP1, WP3, WP5 | 3 | ⚠️ preview (hero only) |
| WP10 | Guest→account migration | Import modal, idempotent copy Dexie→Supabase incl. image re-upload, post-import state | WP1, WP2, WP4 | 3 | ❌ not started |
| WP11 | Pin drag-to-reorder | Drag/reorder + a11y alternatives, persistence | WP5 | 3 | ❌ not started |
| WP12 | Hardening pass | Complete E2E suite (all flows × both modes), Lighthouse budgets, full axe audit, design review fixes, console-error sweep | WP6–WP11 | 4 | ❌ not started |
| WP13 | Release | Public go-live, README, crisis-resources finalization, docs, manual QA script | WP12 | 4 | ❌ not started |

> **Note on WP10:** the merged `wp10-retro-skin` branch is a *skin* work package (retro pixel styling across the app), not the plan's WP10 (guest→account migration). The migration WP10 remains unstarted.

Definition of Done (every WP): code merged on a feature branch → CI green (typecheck, lint, tests) → E2E coverage where applicable → design-review sign-off (for visual WPs) → no open console errors.

---

## 11. Testing & QA strategy ("more" bar)

- **Unit (Vitest):** all pure logic — day-window math (incl. DST, reset-hour edges), jar totals/states, validation, migration idempotency, export shape, pin ordering.
- **Component (RTL + user-event):** every UI primitive and feature component (render, interactions, error/empty states, a11y roles).
- **Repository parity suite:** the same behavioral tests run against Local and Supabase implementations — guest/signed-in behavior cannot diverge.
- **RLS security tests** (local Supabase): cross-user isolation, anon denial, storage ownership. (§9)
- **E2E (Playwright), every tool flow × both modes:** first-run onboarding → guest banner; jar log (< 10 s target), edit/delete, daily-reset behavior, low/overdrawn states; timeline CRUD + zones + images; pin/unpin/reorder + persistence across reload; migration (guest data → sign-in → import → verified in cloud); export; delete; bloom hand-off; **offline shell** (SW serves app, clear offline state); no-console-errors on every route.
- **Accessibility:** axe-core on all routes (CI), keyboard-only walkthrough, reduced-motion E2E (emulate `prefers-reduced-motion`), contrast via Lighthouse.
- **Lighthouse budgets (CI):** PWA ≥ 90, A11y ≥ 95, SEO ≥ 90, Performance ≥ 90, Best Practices ≥ 90 (hash routing + token-driven styles keep this achievable).
- **Manual QA script** in WP13: a checklist of the emotional/usability paths (dysregulated user, low energy, accidental taps, interrupted sessions) that automated tests can't fully judge.

---

## 12. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| GH Pages subpath breaks PWA/SW/deep links | Hash routing + Vite `base` + base-aware `vite-plugin-pwa`; verified in E2E offline test |
| Shared Supabase project breaks bloom | Additive-only rule; preview branch first; never touch `trackers`/`entries`; security tests gate RLS |
| Mental-health data exposed via RLS | RLS-first design; cross-user isolation tests in CI; private bucket; owner-scoped objects |
| Guest/signed-in behavior divergence | Single repository interface + parity test suite against both backends |
| Double-import of local data | Idempotency guard (`local_data_imported_at`) + migration tests |
| Day/reset-timezone bugs | `dayForDate` unit tests (DST, midnight, reset-hour changes); date stamped at write time |
| OneDrive file-lock conflicts | node_modules gitignored; `npm ci`; CI on GitHub; dev guidance |
| Image abuse/limits | Type/size validation, per-entry count, per-user quota, RLS on storage |
| Bloom hand-off feels jarring | Same-tab open, shared tokens, honest copy; stretch teaser deferred |

---

## 13. Future roadmap hooks (not v1)

- **Phase 3 — Advanced Statistics:** with the shared project, reads bloom's `entries`/`trackers` (read-only, per-user RLS) + jar/timeline data; small-sample guardrails; plain-language output. Note: correlation between trackers already exists in bloom's viz — reuse its approach for consistency.
- **Phase 4:** cross-tool insights (spoons ↔ mood SQL joins), more tools via `tools.config.ts`, optional therapist opt-in sharing, bloom `INITIAL_SESSION` patch for a fully seamless hand-off, offline write queue if signed-in offline use matters.

---

## 14. Decisions & confirmed items

1. **Delete semantics — CONFIRMED:** steady "delete data" wipes steady data only (all `steady_*` rows + storage objects), signs out, and keeps the shared account + bloom data intact. Explained to the user in plain language; bloom has its own separate delete.
2. **Crisis resources — CONFIRMED:** default US (988) with switchable Canada (988), UK (Samaritans 116 123), Australia (Lifeline 13 11 14), Israel (ERAN 1201). See §5 "Crisis resources config".
3. **Bloom URL** confirmed live: `https://exauerba.github.io/pink-mood-tracker/`.
4. **Design direction — CONFIRMED:** WP3 hands the design specialist a brief referencing bloom's identity; user reviews the proposed direction before feature builds proceed (see §15 for the exact handoff).

---

## 15. Design-agent handoff (when & what to give it)

### When to call it in

There are **two** distinct touchpoints — a *direction-setting* call and *review* calls.

**Call #1 — direction-setting (once, at the start of WP3).** This happens right after the scaffold + data layer prove out (i.e., after WP0–WP2 are green on `main`) and **before any feature UI is built**. Rationale: the two things users stare at constantly — the Energy Jar and the Timeline — cannot be "filled in later." Every feature (WP6 Jar, WP9 Timeline, WP5 hub) will implement against the design system, so locking the direction first prevents a whole wave of rework. Concretely: run WP3 as a parallel design track while WP1–WP2 finish, but do **not** start WP4+ (app shell, hub, jar) until its output is reviewed and approved.

**Call #2 — review (per-phase checkpoints).** At the end of Wave 2 and Wave 3 (and again in WP12 hardening), the same design standard reviews the built UI against the approved direction — tokens, spacing, motion, a11y — and signs off. Visual WPs are not "done" without this sign-off (it's part of the Definition of Done).

### What to give it (the WP3 brief)

Give the agent one self-contained brief containing:

1. **Product context:** the PRD (path: `therapeutic-toolbox-prd.md`), this plan's §1, §7, §2 (architecture). Stress the two non-negotiable UX bars: *warm, not clinical* and *low cognitive load for a dysregulated user*.
2. **Brand continuity reference:** bloom's current identity to match — read its `styles.css` / `palettes.js` (pastel pink `#f472b6` on `#fff5f7`/`#f6f4f4`, Nunito font, 🌸). The hand-off should feel like the same product. Note: steady keeps its own distinct wordmark but shares the warmth.
3. **The deliverable list** (from §7): tokens (color/type/spacing/radii/motion + reduced-motion), per-tool accents (steady hub, bloom, Energy Jar, Timeline), UI primitive inventory, and **hero visual specs** for the three high-recurrence surfaces — Energy Jar jar/chip rendering incl. low/overdrawn + reduced-motion, Timeline zone-band + entry rendering, hub tool cards.
4. **Explicit constraints:** WCAG 2.1 AA contrast pairs; never color-alone (every state carries icon/text); large touch targets (≥ 44 px); calm default motion, honored `prefers-reduced-motion`.
5. **Output format:** concrete tokens + a working styleguide (Storybook or a hidden `/styleguide` route) — a real implementation the feature agents can import, not just a mockup. Feature agents should never be inventing colors or spacing.
6. **Explicitly tell it what NOT to design:** backend, auth flows, data model, copy tone beyond visual affordances. Keep it in its lane.

### Review gate

You review the proposed direction (the styleguide + hero visuals) before approving. Key question for you: *does this feel like a product you'd hand a dysregulated person at their lowest point?* If yes → approve, feature builds begin. If not → iterate on the brief with the agent before WP4 starts.
