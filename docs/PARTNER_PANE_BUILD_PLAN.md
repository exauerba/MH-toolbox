# Lantern Partners — build plan

A read-only "partner pane" for steady's Lantern. A signed-in user can invite
people (by username) to see their distress scale and their current level, so a
partner/friend/family member can check in with the right words and actions in
the moment. Built on top of the shipped Lantern module (branch
`feat/lantern-scale`, commit 5641672).

Product decisions (confirmed with user, m0363 + m0366):
- **Partner pane is READ-ONLY.** No "I'm here" / nudge / response buttons.
  The partner sees the person's scale + current level, nothing more.
- **Live-status mechanics: A + D.** Manual set by the user + pull-to-refresh
  for the partner. NO realtime subscriptions. The current level auto-expires
  ~60 minutes unless refreshed ("still true?"), or explicitly cleared.
- **Partners added by username** (both people need accounts; username is the
  email local-part, `AUTH_EMAIL_DOMAIN = 'bloom.app'`).
- **Partner must accept the invitation** before seeing anything.
- **Multiple partners per user; a person can be a partner for multiple users.**
- **Photos in the partner pane: DEFERRED (not in MVP).** Research evidence is
  thin (see below); default-OFF per-level opt-in is the documented follow-up.
  Present mode keeps its private photos.
- **Existing Share tab token links stay** — different purpose (anonymous,
  one-time handover).

Psych research grounding (synthesis from consensus/web, full citations in the
Lantern planning notes):
1. **Passive pane, no per-change alerts** — alarm fatigue [4][5]. The pane
   renders "Sam's level: 7, updated 20 min ago". No notifications on change.
2. **Auto-expire ~60 min** — safety planning works because it is activated
   during crisis and deactivated after [1][2]. On expiry show "last updated 2h
   ago" in a neutral tone; never alarm on a stale value.
3. **Relational framing over numbers** — "Sam needs you right now", number
   secondary [1][2]. Invitation copy never obligation ("You can reach out — no
   need to solve anything").
4. **Show the person's own "what helps right now" list** in the pane — doubles
   as an anti-"fixing" device and lowers partner felt responsibility [3][6].
5. **Label-first set flow** — naming the feeling is the regulation [7]; the
   level labels (feelings words) come before the number in the set UI.
6. **Setting a level helps the user regardless of partner** — never gate or
   penalize it [7][8].

---

## Work packages

### WP1 — Data contract (`src/data/types.ts`, `src/data/repository.ts`)

```ts
export type LanternPartnershipStatus = 'pending' | 'active' | 'revoked'

export interface LanternPartnership {
  id: string
  sharerId: string          // the person whose scale is shared
  partnerId: string         // the person who views
  status: LanternPartnershipStatus
  createdAt: string
  updatedAt: string
  // joined display fields (filled by repo/RPC, not stored):
  sharerUsername?: string
  partnerUsername?: string
}

export interface LanternCurrentLevel {
  id: string
  levelId: string
  setAt: string             // ISO
  expiresAt: string         // setAt + 60 min
}

export interface PartnerStatus {
  sharerId: string
  sharerUsername: string
  scaleName: string
  levelCount: number
  levels: LanternLevel[]    // read-only copy, ordered by position
  currentLevel: (LanternCurrentLevel & {
    position: number
    label: string
    description: string
    actions: string[]
  }) | null
}
```

`ExportBundle` is UNCHANGED (current level is transient status; partnerships
are remote-only). `deleteAllData` clears the local current-level row.

Repository contract additions:

```ts
// Current level — works in ALL modes (guest value migrates to account).
getCurrentLevel(): Promise<LanternCurrentLevel | null>
setCurrentLevel(levelId: string): Promise<LanternCurrentLevel>  // upsert; "still true?" = re-set same levelId
clearCurrentLevel(): Promise<void>

// Partnerships — REMOTE-ONLY (LocalRepository: [] / throws / no-ops).
listPartnerships(): Promise<LanternPartnership[]>              // outgoing + incoming for me
addPartner(username: string): Promise<LanternPartnership>       // throws 'Partners need an account' locally
acceptPartnership(id: string): Promise<void>
declinePartnership(id: string): Promise<void>                   // sets status 'revoked'
revokePartnership(id: string): Promise<void>                    // sets status 'revoked'
findUserByUsername(username: string): Promise<{ id: string; username: string } | null>
getPartnerStatus(): Promise<PartnerStatus[]>                    // active partnerships where I am partner
```

### WP2 — Migration `supabase/migrations/20260927000000_010_partners.sql`

Additive-only, `steady_*` tables, RLS. Apply via dashboard SQL editor (CLI is
broken for this shared project — see Lantern notes).

**`steady_lantern_partnerships`**
- `id uuid pk default gen_random_uuid()`
- `sharer_id uuid not null references auth.users(id) on delete cascade`
- `partner_id uuid not null references auth.users(id) on delete cascade`
- `status text not null default 'pending' check (status in ('pending','active','revoked'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `unique (sharer_id, partner_id)`

RLS (two complementary policies, OR-combined):
- **sharer manages outgoing:** `using (sharer_id = auth.uid()) with check (sharer_id = auth.uid())` — select/insert/update/revoke own invitations.
- **partner sees + accepts incoming:** `using (partner_id = auth.uid()) with check (partner_id = auth.uid())` — select incoming, update pending→active (accept) or →revoked (decline). Partner can never modify sharer_id/partner_id columns (check clause).

**`steady_lantern_current_levels`**
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `level_id uuid not null references steady_lantern_levels(id) on delete cascade` (scale edits cascade-clear the status)
- `set_at timestamptz not null default now()`
- `expires_at timestamptz not null`
- `unique (user_id)` — one current level per user

RLS: owner all (`user_id = auth.uid()`). Partners never select this table
directly — they read via the RPC below.

**RPC `find_user_by_username(p_username text)`** — SECURITY DEFINER,
`set search_path = public`, revoke from public, grant to authenticated.
Resolves `lower(email) = lower(p_username) || '@bloom.app'` (mirrors
`AUTH_EMAIL_DOMAIN` in `src/auth/authCore.ts`), excludes the caller
(`id <> auth.uid()`), returns `jsonb {id, username}` or null. Username =
email local-part. (Enumeration surface: returns only a uuid for a known
username — acceptable; the caller must already know the username.)

**RPC `get_partner_status()`** — SECURITY DEFINER, `set search_path = public`,
revoke from public, grant to authenticated. Returns `jsonb` array, one entry
per ACTIVE partnership where `partner_id = auth.uid()`:

```json
[{
  "sharerId": "…",
  "sharerUsername": "sam",
  "scaleName": "My Lantern",
  "levelCount": 10,
  "levels": [{ "position": 1, "label": "Grounded", "description": "…", "actions": ["…"] }],
  "currentLevel": { "levelId": "…", "setAt": "…", "expiresAt": "…",
                    "position": 7, "label": "Spiraling", "description": "…", "actions": ["…"] } | null
}]
```

Joins `steady_lantern_partnerships` → `steady_lantern_scales` (by sharer_id) →
`steady_lantern_levels` (ordered) → latest `steady_lantern_current_levels`
row for the sharer. Text-only; never returns image paths or the sharer's
other data. Expiry is a client-side display concern (no cron).

### WP3 — Local (Dexie) implementation

`src/data/local/db.ts`: `db.version(4)` repeating v3 stores + one new store
`lanternCurrentLevels: 'id'` (single row, id = 'current').

`LocalRepository`:
- `getCurrentLevel` / `setCurrentLevel` (upsert row with `setAt = now()`,
  `expiresAt = now() + 60min`) / `clearCurrentLevel` (delete row).
- Partnerships: `listPartnerships` → `[]`, `addPartner` → throw
  `'Partners need an account'`, `accept/decline/revokePartnership` → no-op,
  `findUserByUsername` → null, `getPartnerStatus` → `[]`.
- `deleteAllData` clears `lanternCurrentLevels`.

### WP4 — Supabase implementation

`SupabaseRepository`:
- Row interfaces + mappers (`partnershipFromRow` with username joins via
  `auth.users` select on the partnership query — or derive from the RPC;
  `currentLevelFromRow`).
- `getCurrentLevel` / `setCurrentLevel` (upsert on `user_id`) /
  `clearCurrentLevel` — direct table access (owner RLS).
- `listPartnerships` — two selects (outgoing where sharer_id=me, incoming
  where partner_id=me) merged + sorted by updatedAt desc; usernames resolved
  via `auth.users` select (email local-part).
- `addPartner` — `findUserByUsername` RPC → insert `{sharer_id: me,
  partner_id: found.id, status: 'pending'}`; unique violation → friendly error
  ('Already connected' / 'Invitation already sent').
- `acceptPartnership` / `declinePartnership` / `revokePartnership` — update
  status (partner updates incoming; sharer updates outgoing; RLS enforces).
- `getPartnerStatus` — `supabase.rpc('get_partner_status')` → map rows to
  `PartnerStatus[]`.

### WP5 — Fake + parity

`FakeRepository`: in-memory `currentLevel` + `partnerships` map; deterministic
usernames (`user-a`, `user-b`); `getPartnerStatus` derives from active
partnerships + stored scale. `tests/parity.suite.ts`: current-level group
(shared across all three: null-before-set, set+get round-trip, re-set refreshes
expiresAt, clear, deleteAllData wipes) + partnerships group gated to
Fake+Supabase via the existing `supportsShares`-style flag (Local has none).

### WP6 — Migration of local data

`migrateLocal.ts`: counts += `lanternCurrentLevels`; loop re-sets the current
level on the remote repo (preserving levelId — the scale is migrated first with
preserved ids, so the FK holds). Partnerships are remote-only — nothing to
migrate.

### WP7 — Partners tab UI

`src/features/lantern/LanternScreen.tsx`: add 4th tab `{ value: 'partners',
label: 'Partners', icon: 'user' }`; render `<PartnersTab scale={scale}
onError={setError} />`.

**`src/features/lantern/PartnersTab.tsx`** (signed-in gating via `useAuthMode`,
ShareTab pattern):
- Guest: "Partners need an account" message (same copy family as ShareTab).
- **Your current level** card (top): shows current status — "Level 7 ·
  Spiraling · set 20 min ago · expires in 40 min" — with **Set my level**
  (opens SetLevelSheet), **Still true?** (re-set same levelId), **Clear**
  buttons. Expired → neutral "Last updated 2h ago" (no alarm). Never set →
  "No current level — set one so your people know where you are."
- **Add a partner**: username TextInput (validated with `usernameIsValid` from
  authCore) + Add button → `findUserByUsername` → `addPartner` → refresh.
  Errors surfaced inline ("No one with that username", "Already connected").
- **Outgoing** list: pending ("Awaiting Sam's reply") / active / revoked, with
  revoke on pending+active.
- **Incoming** list: pending invitations with **Accept** / **Decline**.
- **Active partnerships**: each renders `<PartnerPane status={…} />`.

**`src/features/lantern/PartnerPane.tsx`** — read-only, relational framing:
- Header: "{username}'s lantern" + scale name + **Refresh** button
  (pull-to-refresh equivalent; no realtime).
- Current level card: if set & unexpired → tone-colored numeral badge
  (reuse `toneForLevel`/`isCrisisLevel`), label, description, "What helps
  right now" action list (sparkle icons), "updated X ago". Crisis tone →
  crisis callout with region resources (crisis.ts). Expired → neutral
  "Last updated X ago". Never set → "No current level right now."
- Full scale list read-only (current level highlighted), same LevelRow
  styling minus edit controls.
- Copy: "You can reach out — no need to solve anything." No response buttons.

**`src/features/lantern/SetLevelSheet.tsx`** — label-first modal:
- Heading "Where are you right now?" + warm copy ("Naming it helps. Pick the
  closest level — you can change it anytime.").
- Level list ordered by position with tone badges; the LABEL is the primary
  text, the number secondary (affect-labeling principle).
- Selecting a level shows its "what helps right now" actions as a preview
  ("Your partner will see these").
- Set → `setCurrentLevel(levelId)`; footer shows current status + Clear.

### WP8 — Tests

- `PartnersTab.test.tsx` (guest message; add-partner flow with mocked
  findUserByUsername; accept/decline incoming; revoke outgoing; current-level
  card states incl. expired).
- `PartnerPane.test.tsx` (renders scale + current level; crisis callout on
  high; neutral expired state; no response buttons present).
- `SetLevelSheet.test.tsx` (label-first list; set calls repo; clear).
- `present.ts` helpers reused; no new pure logic expected beyond a small
  `levelAge.ts` (or inline): `minutesSince(iso)`, `isExpired(level, now)`.

### WP9 — e2e + RLS + docs

- `e2e/partners.spec.ts` — guest sees "Partners need an account"; set-level
  flow works in guest mode (current level card updates); signed-in flows
  covered by unit tests (no real creds in CI).
- `tests/rls-security.test.ts` — TableSpecs for `steady_lantern_partnerships`
  (A invites B; B cannot see A's other rows; B accepts; A revokes) and
  `steady_lantern_current_levels` (owner-only).
- `docs/SECURITY_AUDIT.md` — Lantern Partners section: RLS posture, the two
  SECURITY DEFINER RPCs (why they exist, what they return, grants), username
  enumeration note, photos deferred.

---

## Subagent strategy

| Work package | Who | Why |
|---|---|---|
| WP1 contract | Main thread | Highest-impact change |
| WP2 migration SQL | Main thread | Security-sensitive (RLS + 2 RPCs) |
| WP3 LocalRepository | Subagent (general) | Mechanical; give exact method list + db.ts v4 pattern |
| WP4 SupabaseRepository | Subagent (general) | Mechanical; give row-mapper conventions + RPC call shapes |
| WP5 Fake + parity | Subagent (general) | Mechanical; give parity suite structure + supportsShares flag |
| WP6 migrateLocal | Main thread | Touches export/migration contract |
| WP7–8 UI + tests | Main thread | Copy is product-sensitive (relational, non-clinical voice) |
| WP9 e2e | Subagent (general) | Mechanical |

Subagent prompts must include: exact file paths, exact method signatures,
pattern files (e.g. `ShareTab.tsx` for signed-in gating, `LocalRepository.ts`
timeline methods), constraint list (camelCase contract, `steady_*` prefix,
no unrelated refactors), and a verification command.

---

## Design-agent handoff points (vision-enabled)

1. **After WP7 (Partners tab + pane + set sheet) — visual review.**
   Brief: review the read-only partner pane (relational framing, calm tone,
   crisis callout on high levels, "updated X ago" states) and the label-first
   set sheet against the Lantern design language. Deliverable: concrete
   spacing/type/color adjustments. Run `npm run dev`, screenshot
   `/#/tools/lantern` (Partners tab) in guest + signed-in states.

2. **After WP9 — final pass.** Brief: full Lantern flow (Scale → Show →
   Share → Partners) + hero. Deliverable: any remaining polish.

---

## Verification

- `npx vitest run` (unit + parity + RLS env-gated)
- `npm run lint`, `npx tsc -p tsconfig.app.json --noEmit`
- `npm run build`
- `npx playwright test e2e/partners.spec.ts`
- Manual: guest set-level flow; signed-in invite→accept→pane round-trip
  (two accounts), expiry + "still true?" refresh.

## Follow-ups (documented, not in MVP)

- Photos in partner pane: default OFF, per-level opt-in, instant hide/revoke
  (thin evidence — user-test first).
- Realtime or push when level is high AND stale (alarm-fatigue-safe batching).
- Partner "check in later" reminder (opt-in, low burden).