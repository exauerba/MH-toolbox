# Lantern — build plan

A distress/support scale for steady. One editable scale (default 10 levels, 3–12
configurable) describing escalating moments of distress. Each level has a short
label, a description ("what this looks like for me"), a list of actions ("what
helps right now"), and optional uploaded photos. Built to be handed to a
partner/friend/family member in the moment, with an optional read-only share
link for signed-in users. The top level always surfaces crisis resources (988).

Product decisions (confirmed with user):
- **Name:** Lantern. **Accent:** warm sea-glass teal (new family, distinct from
  jar amber / breathe lilac / timeline sage).
- **Single scale** per user (not multiple named scales).
- **Seed a warm, fully-editable starter scale** (10 levels) on first open.
- **Visuals:** uploaded photos per level, stored securely (Dexie blobs in guest
  mode; private `steady-media` bucket when signed in — the timeline pattern).
- **In-the-moment use:** hand-over present mode (everyone) + copy-as-text
  (everyone) + partner share link (signed-in only).
- **Partner link is text-only** for MVP (labels/descriptions/actions). Photos
  stay private and appear in present mode only. Image sharing via token-gated
  copies is a documented follow-up.

Design rules inherited from the repo:
- Never color-alone: every level carries icon + label + copy.
- Warm, non-clinical, generous type (dysregulated readability).
- Reduced-motion compliant; final state must render at rest.
- Crisis resources (`src/shared/crisis.ts`) surface on the top level(s).
- `steady_*` prefix only; migrations additive-only; never touch bloom's tables.

---

## Work packages

### WP1 — Data contract (`src/data/types.ts`, `src/data/repository.ts`)

Domain types (camelCase, THE contract):

```ts
export interface LanternScale {
  id: string
  name: string              // default "My Lantern"
  levelCount: number        // 3–12, default 10
  levels: LanternLevel[]    // ordered by position, 1..levelCount
  createdAt: string
  updatedAt: string
}

export interface LanternLevel {
  id: string
  position: number          // 1 = most grounded … levelCount = crisis
  label: string
  description: string
  actions: string[]         // what helps right now
}

export interface LanternImage {   // metadata only; bytes live in storage
  id: string
  levelId: string
  storagePath: string
  createdAt: string
}

export interface LanternScaleInput {
  id?: string
  name: string
  levelCount: number
  levels: LanternLevel[]
}

export interface LanternShare {
  id: string
  label: string             // partner name, e.g. "Sam"
  token: string
  createdAt: string
  revokedAt: string | null
}
```

`ExportBundle` gains `lanternScale: LanternScale | null` and
`lanternImages: LanternImage[]` (metadata only — same rule as timeline).

Repository contract additions:

```ts
getLanternScale(): Promise<LanternScale | null>
saveLanternScale(s: LanternScaleInput, existingId?: string): Promise<LanternScale>
listLanternImages(levelId: string): Promise<ImageRef[]>
uploadLanternImage(file: File, levelId: string): Promise<ImageRef>
deleteLanternImage(ref: ImageRef): Promise<void>

// Remote-only (partner sharing). LocalRepository returns null / no-ops.
listLanternShares(): Promise<LanternShare[]>
createLanternShare(label: string): Promise<LanternShare>
revokeLanternShare(id: string): Promise<void>
```

`saveLanternScale` semantics: upsert the scale row; upsert levels by id; delete
levels whose id is absent from the input (whole-doc replace). Level ids are
generated client-side (`crypto.randomUUID()`), so edits are idempotent.

### WP2 — Migration `supabase/migrations/20260915000000_008_lantern.sql`

Additive-only, `steady_*` tables, RLS owner policies (copy the breathe
migration's shape):

- `steady_lantern_scales` — `id uuid pk`, `user_id`, `name text not null`,
  `level_count integer not null default 10 check (level_count between 3 and 12)`,
  `created_at`, `updated_at`. RLS: owner all.
- `steady_lantern_levels` — `id uuid pk`, `user_id`, `scale_id uuid references
  steady_lantern_scales(id) on delete cascade`, `position integer not null`,
  `label text not null`, `description text not null default ''`,
  `actions text[] not null default '{}'`, `created_at`, `updated_at`.
  Unique `(scale_id, position)`. RLS: owner all.
- `steady_lantern_images` — `id uuid pk`, `user_id`, `level_id uuid references
  steady_lantern_levels(id) on delete cascade`, `storage_path text not null`,
  `created_at`. RLS: owner all.
- `steady_lantern_shares` — `id uuid pk`, `user_id`, `token uuid not null
  unique default gen_random_uuid()`, `label text not null`, `created_at`,
  `revoked_at timestamptz`. RLS: owner all. **No anon policies on any table.**

Share RPC (SECURITY DEFINER, locked search_path):

```sql
create or replace function public.get_shared_scale(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scale jsonb;
begin
  select jsonb_build_object(
    'name', s.name,
    'levelCount', s.level_count,
    'levels', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', l.position,
        'label', l.label,
        'description', l.description,
        'actions', l.actions
      ) order by l.position)
      from steady_lantern_levels l
      where l.scale_id = s.id
    ), '[]'::jsonb)
  )
  into v_scale
  from steady_lantern_scales s
  join steady_lantern_shares sh on sh.scale_id = s.id
  where sh.token = p_token and sh.revoked_at is null;

  return coalesce(v_scale, 'null'::jsonb);
end;
$$;

revoke all on function public.get_shared_scale(p_token uuid) from public;
grant execute on function public.get_shared_scale(p_token uuid) to anon, authenticated;
```

Note: `steady_lantern_shares` needs a `scale_id` column (add to the table
definition above). The RPC returns text-only data — no image paths, no user
metadata, no scale id. Anon cannot select from any `steady_lantern_*` table
directly; the function is the only door.

### WP3 — Local (Dexie) implementation

`src/data/local/db.ts`: bump to `db.version(3)` adding stores
`lanternScales: 'id'`, `lanternLevels: 'id, scaleId'`, `lanternImages: 'id, levelId'`,
`lanternShares: 'id'` (shares unused locally but kept for type parity).

`LocalRepository`:
- `getLanternScale` — read scale row + levels (ordered by position), assemble.
- `saveLanternScale` — put scale; upsert levels by id; delete levels not in
  input (and their images).
- `listLanternImages` / `uploadLanternImage` / `deleteLanternImage` — mirror the
  timeline blob pattern (`LocalImage`-style rows, blob: URLs recreated on read,
  `MAX_IMAGES_PER_LEVEL = 3`).
- Shares: `listLanternShares` → `[]`, `createLanternShare` → throw
  `new Error('Sharing requires an account')`, `revokeLanternShare` → no-op.
- `exportAll` / `deleteAllData` updated.

### WP4 — Supabase implementation

`SupabaseRepository`: snake_case row mappers (`lanternScaleFromRow`,
`lanternLevelFromRow`, `lanternShareFromRow`), upsert logic mirroring
`saveTimelineEntry` (check existing by id + user_id, update or insert).
Images: reuse `steady-media` bucket at `{userId}/{levelId}/{uuid}{ext}`,
signed URLs TTL 1h. Shares: insert with `token` returned by Postgres default;
revoke sets `revoked_at = now()`.

### WP5 — Fake + parity

`FakeRepository`: in-memory maps for scale/levels/images/shares; shares return a
deterministic fake token. `tests/parity.suite.ts`: add cases for
scale save/get/update/delete-levels, image upload/list/delete, export/delete
round-trip. Shares excluded from parity (remote-only).

### WP6 — Migration of local data

`migrateLocal.ts`: add `lanternScale` + `lanternImages` counts; save the scale
doc (preserving ids), re-upload image blobs via `listLanternImages` +
`fetch(blobUrl)` (timeline pattern). `hasLocalData` includes lantern fields.

### WP7 — Tool wiring

- `src/tools/tools.config.ts`: `ToolId`/`ToolAccent` unions + entry
  `{ id: 'lantern', name: 'Lantern', tagline, description, icon: 'lantern',
     accent: 'lantern', route: '/tools/lantern', pinnedByDefault: true }`.
- `src/app/AppShell.tsx`: `<Route path="/tools/lantern">` and
  `<Route path="/share/:token">` (read-only shared view).
- `src/design/icons.tsx`: `'lantern'` in `IconName` + stroke path.
- `src/design/pixelSprites.ts`: 16×16 lantern sprite.
- Accent ramp `lantern` (sea-glass teal) in `src/index.css` `@theme` AND
  `src/design/tokens.ts` (+ `colorsDark` + `toolAccents`), synced by
  `tokens.test.ts`.

### WP8 — Pure logic + starter content

- `src/features/lantern/starterScale.ts` — the seeded default: 10 levels,
  warm copy, escalating from "Grounded" to "I'm not safe alone". Exported
  `STARTER_SCALE` + `buildStarterScale()` (fresh ids each call).
- `src/features/lantern/format.ts` — `formatScaleForText(scale)` (share-as-text)
  and `formatLevelForText(level)`.
- `src/features/lantern/present.ts` — level → tone/urgency helpers
  (`isCrisisLevel(level, levelCount)`, `toneForLevel`), unit-tested.
- `src/features/lantern/demoData.ts` — `seedStarterScale(repo)` (idempotent:
  only seeds when `getLanternScale()` is null).

### WP9 — Screen + editor

`src/features/lantern/LanternScreen.tsx` (breathe pattern: header + back,
`SegmentedControl` tabs, `useRepository()` only):
- **Scale tab** — scale name + level-count stepper (3–12; pruning appends or
  removes levels, preserving content); vertical list of levels (numeral, label,
  photo thumb, description, actions chips); tap → level editor modal.
- **Level editor modal** — label, description, actions add/remove (chip input,
  breathe presets pattern), photo upload/remove (up to 3, `imageRules`).
- Loading/error/empty states; `EmptyState` with "Seed the starter scale" action.

### WP10 — Present mode (hand-over)

Fullscreen overlay from the Show tab:
- One level at a time: huge numeral, label, description, actions list, photo(s),
  progress dots, big prev/next.
- "Which level am I at?" quick self-locate before handing over.
- Crisis callout pinned on the top levels (from `src/shared/crisis.ts`).
- High contrast, reduced-motion compliant, `role="dialog"` semantics, Escape to
  exit.

### WP11 — Share tab + partner link

- **Copy as text** (everyone): `formatScaleForText` → clipboard +
  `navigator.share` fallback.
- **Partner link** (signed-in only): name a partner → `createLanternShare` →
  copy `https://…/#/share/<token>`; list active shares with revoke.
- `src/features/lantern/SharedLantern.tsx` — read-only view at `/share/:token`,
  calls `get_shared_scale` RPC via the Supabase client directly (works for
  non-account visitors). No shell nav; minimal chrome; crisis resources shown
  on top levels.

### WP12 — Hero, styleguide, e2e, docs

- `src/design/hero/LanternHero.tsx` + `SpecPanel` in `Styleguide.tsx`.
- `e2e/lantern.spec.ts` (seed, edit level, present mode, copy text) and
  `e2e/share.spec.ts` (env-gated partner link flow).
- `tests/rls-security.test.ts` table assertions.
- `docs/SECURITY_AUDIT.md` note; this file is the reference.

---

## Subagent strategy

Delegate mechanical, well-specified work to subagents; keep design-sensitive and
contract work in the main thread.

| Work package | Who | Why |
|---|---|---|
| WP1 types/repo contract | Main thread | Highest-impact change; review as such |
| WP2 migration SQL | Main thread | Security-sensitive (RLS + RPC) |
| WP3 LocalRepository | Subagent (general) | Mechanical mirror of timeline/breathe patterns; give exact method list + file paths |
| WP4 SupabaseRepository | Subagent (general) | Same; give row-mapper conventions + bucket path rules |
| WP5 Fake + parity | Subagent (general) | Mechanical; give parity suite structure |
| WP6 migrateLocal | Main thread | Touches export contract |
| WP7 wiring | Main thread | Small, cross-cutting |
| WP8 pure logic + starter copy | Main thread | Copy is product-sensitive (warm, non-clinical voice) |
| WP9–11 UI | Main thread | Design-sensitive |
| WP12 hero/styleguide/e2e | Subagent (general) for e2e; design agent for hero | e2e is mechanical; hero is visual |

Subagent prompts must include: exact file paths, the exact method signatures to
implement, the pattern file to copy (e.g. `LocalRepository.ts` timeline image
methods), the constraint list (camelCase contract, `steady_*` prefix, no
refactoring unrelated code), and a verification command (`npx vitest run
tests/parity.suite.ts`).

---

## Design-agent handoff points (vision-enabled)

Pause points where a vision-enabled design agent should review or produce
visuals. Each handoff ships a self-contained brief + the current build state.

1. **After WP7 (wiring) — accent ramp + icon + sprite.**
   Brief: sea-glass teal ramp (50–900) that passes AA on canvas/ink in both
   themes; a `lantern` stroke icon (24px grid, 1.5px stroke, rounded caps,
   matching `icons.tsx` conventions); a 16×16 pixel sprite matching
   `pixelSprites.ts` conventions. Deliverable: exact hex values + SVG path +
   sprite grid. Verify with `tokens.test.ts` + styleguide swatches.

2. **After WP9 (screen + editor) — visual review of the Scale tab.**
   Brief: review the level list + editor modal against the design language
   (warm, non-clinical, big type, icon+label+copy). Deliverable: concrete
   spacing/type/color adjustments, not rewrites.

3. **After WP10 (present mode) — visual review of hand-over mode.**
   Brief: review the fullscreen present mode for legibility at arm's length,
   high-contrast, reduced-motion compliance, and emotional tone (calm, not
   clinical). Deliverable: concrete adjustments.

4. **After WP12 — LanternHero.**
   Brief: an interactive hero visual for the styleguide (follows
   `JarHero.tsx`/`BreatheHero.tsx` + `SpecPanel` pattern): a lantern that
   glows brighter as the scale climbs. Deliverable: implementation.

Each handoff should be run with the app live (`npm run dev`) and screenshots
taken at the relevant routes so the design agent sees real rendered output.

---

## Verification

- `npx vitest run` (unit + parity + RLS env-gated)
- `npm run lint` and `npx tsc --noEmit`
- `npm run build` (Vite + PWA)
- `npx playwright test e2e/lantern.spec.ts` (and share spec when env present)
- Manual: guest mode (seed, edit, present, copy text) + signed-in (partner link)