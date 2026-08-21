# steady

**A toolbox you can hold onto.**

steady is a warm, quiet, never-clinical mental-health PWA. It's a hub of
small, self-guided emotional-regulation and processing tools — for the days
when the usual ones feel too heavy. Everything stays on your device unless you
choose to sign in.

Inside the toolbox today:

- **Energy Jar** — a spoon-theory tracker. Your spoons for the day in one
  place: quick-add, gentle limits, and a jar you can actually see. Three calm
  states (healthy, low, overdrawn) plus a 7-day history and a "where your
  spoons went" pattern view.
- **Personal Timeline** — build the story of your life, one zone at a time.
  Entries with dates, colours, descriptions and photos, sitting on bands you
  define yourself.
- **Mood & Symptom Tracker (bloom)** — a same-tab hand-off to the existing
  **bloom** mood tracker, in the same warm tones, so it never feels like
  leaving steady.

steady is a personal tool, **not a clinician**. It doesn't diagnose, treat, or
replace professional care. The About screen always points back to real crisis
resources, switchable by region (default: US 988).

## Storage modes

steady has two modes, and the app tells you which one you're in:

- **Guest mode (default)** — everything is stored locally in your browser via
  **Dexie / IndexedDB**. Nothing leaves your device. No account, no sign-in.
- **Signed-in mode** — your data syncs to a **Supabase** backend (Postgres +
  Storage) so it's backed up and available across devices. Sign in uses a
  simple username + password, mirroring bloom's scheme.

You can start as a guest and sign in later — the guest banner and Settings
explain what signing in means for your data.

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Routing | react-router v7 (HashRouter — GH Pages-safe deep links) |
| Local storage | Dexie 4 (IndexedDB) |
| Backend | `@supabase/supabase-js` v2 (Auth, Postgres, Storage) |
| PWA | `vite-plugin-pwa` (Workbox) |
| Unit tests | Vitest + React Testing Library |
| E2E tests | Playwright |
| Lint/format | ESLint 9 (flat config) + Prettier |

## Getting started

```bash
npm install

# Create your environment file and fill in the Supabase values:
cp .env.example .env
```

`.env` needs two values (see `.env.example`):

- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — the public **anon** key

> The anon key is public by design — it's safe to ship to the client. Your data
> is protected by **Row Level Security (RLS)**, which scopes every query to the
> signed-in owner. `SUPABASE_SERVICE_ROLE_KEY` is server/CI-only and must never
> be shipped to the client.

If you leave `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` empty, the app runs
entirely in guest mode (local-only, no auth UI).

Then start the dev server:

```bash
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) then production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | TypeScript type-check only |
| `npm run lint` | ESLint (flat config) + Prettier-friendly |
| `npm test` | Run Vitest unit/component tests |
| `npm run test:rls` | Run the RLS security suite (`tests/rls-security.test.ts`) — needs env vars |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run e2e` | Run Playwright end-to-end tests |

## Architecture

steady's data layer is built around a single contract, the
**`ToolboxRepository`** interface in `src/data/repository.ts`. Every feature
reads and writes through it, returning **domain objects** (never raw database
rows). Three implementations sit behind it, swapped by auth state:

- **`LocalRepository`** (`src/data/local/`) — Dexie/IndexedDB, used in guest
  mode.
- **`SupabaseRepository`** (`src/data/supabase/`) — Postgres + Storage, used
  when signed in.
- **`FakeRepository`** (`src/data/testing/`) — an in-memory reference used in
  tests.

The **`RepositoryProvider`** (`src/data/RepositoryProvider.tsx`) listens to the
auth session and swaps `LocalRepository ↔ SupabaseRepository` automatically on
sign-in/out. Because both real implementations run the **same behavioral
suite** (`tests/parity.suite.ts`), what works in guest mode must work signed-in
by construction.

### Backend

steady shares a **single Supabase project with bloom** (project
`xxtavjeetzvtlhwoenho`), used additively. steady owns a set of `steady_*`
tables (`steady_profiles`, `steady_pins`, `steady_jar_days`, `steady_jar_logs`,
`steady_timeline_entries`, `steady_timeline_zones`, `steady_timeline_images`)
with RLS enabled and scoped to the owner (`auth.uid()`). Images live in the
private `steady-media` storage bucket, owner-scoped. Bloom's own tables are
never touched.

`steady-delete-account` is a Supabase Edge Function
(`supabase/functions/steady-delete-account/`) that permanently deletes a signed
user and their data via the service-role key.

The shared project means steady and bloom share the same auth namespace
(`username@bloom.app`) and origin — one identity across the toolbox, no second
account.

## Testing

- **Unit (Vitest)** — pure logic (day/reset-hour math, jar states, validation,
  migration idempotency, export shape, pin ordering) plus component tests.
- **Repository parity suite** — the same behavioral tests against the local
  and Supabase implementations.
- **RLS security tests** (`npm run test:rls`) — cross-user isolation, anon
  denial, storage ownership. These need `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` and run against a local
  Supabase stack.
- **E2E (Playwright)** — 27 tests across 10 specs in `e2e/`, covering every
  tool flow, both modes, and the offline shell.
- **Lighthouse budgets in CI** — Performance ≥ 90, Accessibility ≥ 95, Best
  Practices ≥ 90, SEO ≥ 90 (see `lighthouserc.cjs`).

## Deployment

steady is deployed to **GitHub Pages** at `https://exauerba.github.io/MH-toolbox/`
via GitHub Actions (`.github/workflows/deploy.yml`): on merge to `main` it
builds `dist/` and deploys with `actions/deploy-pages`. The Vite `base` is
`/MH-toolbox/`, and the app uses hash routing so deep links and offline reloads
work with zero server-side config. CI (`.github/workflows/ci.yml`) runs
typecheck, lint, unit, RLS security, E2E, and Lighthouse budgets on every PR
and push to `main`.
