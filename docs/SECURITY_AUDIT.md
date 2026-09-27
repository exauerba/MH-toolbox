# Security Audit — steady / MH-toolbox (GitHub Pages PWA)

**Date:** 2026-08-21
**Scope:** Read-only audit of the public `MH-toolbox` repository, deployed as a GitHub
Pages PWA. Method: four parallel read-only subagents (git-history secrets scan, frontend
client-side, Supabase backend, CI/CD supply chain) + `npm audit` + manual verification of
the two critical findings.

**Stack:** React 19 + Vite + TypeScript + Tailwind, `@supabase/supabase-js` ^2.112.3,
Dexie (IndexedDB), `react-router-dom` v7, PWA (`vite-plugin-pwa`), vitest, Playwright,
`@lhci/cli`.

**Sensitivity note:** the app stores intimate mental-health data (energy/spoon logs,
timelines with free-text descriptions, photos). Data-exposure and XSS findings are
weighted higher because of this.

---

## Executive verdict

The core data-layer security is **genuinely good**: every `steady_*` user-data table has
RLS enabled with `auth.uid()`-scoped policies, no XSS sinks exist, no secrets have ever
been committed, and the destructive edge function has no IDOR. The material weaknesses
are concentrated at the **edges**:

1. **C1 — plaintext auth session in localStorage** (Critical): one XSS or injected script
   steals the whole account + all cloud data.
2. **C2 — production service-role key exposed in CI** (Critical): runs in job-level env on
   every PR, against the shared production project.
3. **H1 — no CSP / clickjacking protection** on a host that cannot send headers (High).
4. Storage-layer gaps (M1–M3) that let an authenticated attacker cross tenant boundaries
   or upload arbitrary files.

**Bottom line:** no live secret is exposed and no anonymous attacker can read user data
today, but a single client-side injection (or a compromised CI dependency) would escalate
to full account takeover because the session token and journal sit in plaintext with no
CSP containment layer.

---

## Critical

### C1 — Plaintext auth session in localStorage

`src/config/supabase.ts:14-15` creates the client with **no options**:

```ts
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null
```

supabase-js defaults `persistSession: true`, `autoRefreshToken: true`,
`detectSessionInUrl: true`, so the access + refresh JWTs are written to
`localStorage['sb-xxtavjeetzvtlhwoenho-auth-token']` **in plaintext**. Every operation
reads this session (`SupabaseRepository.ts:140-144` → `client.auth.getSession()`).

**Impact:** one same-origin script (stored/reflected XSS, compromised dependency, or a
malicious extension) exfiltrates the entire account session + all cloud-backed therapy
data in a single request; the refresh token keeps the session alive indefinitely.

**Fix:** disable persistence and URL-session detection so the session lives in memory
only (`persistSession: false, autoRefreshToken: false, detectSessionInUrl: false`).
**Tradeoff:** users must re-authenticate after a full page reload (no silent session
restore). Accepted for a mental-health app where the data is more valuable than the
convenience. Applied in `src/config/supabase.ts`.

### C2 — Production service-role key in CI

`ci.yml:50-53` (unit job) and `ci.yml:119-122` (rls job) inject `SUPABASE_SERVICE_ROLE_KEY`
as **job-level** env — visible to every step, including third-party `actions/setup-node`.
The key bypasses RLS entirely. Tests run against the **shared hosted project**
`xxtavjeetzvtlhwoenho` — the same project the deployed app **and bloom** use
(`README.md:119-120`, `tests/rls-security.test.ts:4-5`).

**Impact:** a compromised dependency, action, or a fork-PR exfiltrating the runner env
grants full, RLS-bypassing read/write over production data.

**Fix applied:**
- Removed `SUPABASE_SERVICE_ROLE_KEY` from the `unit` job (its integration test
  `repository-supabase.test.ts` self-skips without the key, which is acceptable there).
- Scoped the three keys to **step-level** env on exactly the `npm run test:rls` step.
- Added workflow-level `permissions: contents: read`.

**Remaining recommendation (documented, not applied):** the strongest option is to run
RLS tests against an ephemeral local `supabase start` instead of the shared prod project,
so the service-role key never enters CI at all. The current `.env.example` /
`supabase/config.toml` docs claim this but the workflow never does it — see M6.

---

## High

### H1 — No CSP / clickjacking protection

`index.html` has no CSP, no `frame-ancestors`, no `X-Content-Type-Options`, no
`Referrer-Policy`. GitHub Pages cannot send response headers, so meta tags are the only
available control. Destructive flows (`DeleteDataCard.tsx`, `DeleteAccountCard.tsx`) are
frameable.

**Fix applied:** added a CSP meta tag + `referrer no-referrer` to `index.html`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' blob: data: https://xxtavjeetzvtlhwoenho.supabase.co;
connect-src 'self' https://xxtavjeetzvtlhwoenho.supabase.co
              wss://xxtavjeetzvtlhwoenho.supabase.co;
font-src 'self'; object-src 'none'; frame-ancestors 'none';
base-uri 'self'; form-action 'self'
```

`style-src 'unsafe-inline'` is retained because React inline styles and Tailwind require
it; it is far less dangerous than script `unsafe-inline`. **Residual limitation (kept
honest):** the `frame-ancestors` directive is ignored in `<meta>` CSP by current
browsers, and `X-Frame-Options` is header-only — so clickjacking cannot be *fully*
prevented on GitHub Pages. The destructive actions remain a candidate for an in-app
confirmation re-prompt (e.g. type-to-confirm) as defense-in-depth.

### H2 — Sensitive data unencrypted at rest in the browser (deferred)

Dexie DB `steady` (`src/data/local/db.ts:40-52`) stores journal logs, timeline entries
(free-text `description`), zones, and raw image blobs unencrypted; the service-worker
`steady-media` cache holds photos for 24h / 100 entries. The app advertises "Everything
you put in steady stays on this device" (`AboutScreen.tsx:101`) but stores it plaintext.

**Status:** deferred. This needs a design decision (WebCrypto encryption of Dexie records
+ a key-management story, or reducing/removing SW media caching). Documented here for a
follow-up rather than bolted on in this pass.

### H3 — Actions pinned to moving tags

All `uses:` are `@v4` / `@v3` moving tags (checkout, setup-node, upload-pages-artifact,
deploy-pages) across `ci.yml` and `deploy.yml`.

**Fix applied:** SHA-pinned every action to its current tag commit.

### H4 — No dependency / SAST scanning

No `dependabot.yml`, no `npm audit` step, no CodeQL/zizmor/actionlint.

**Fix applied:** added `.github/dependabot.yml` (npm + github-actions, weekly) and an
`audit` job running `npm audit --omit=dev --audit-level=high` (prod deps only — see
"Verified clean" below; the 10 dev-only advisories trace to `@lhci/cli` with no real
upstream fix).

---

## Medium

| ID | Finding | Evidence | Fix | Status |
|----|---------|----------|-----|--------|
| M1 | `steady_timeline_images` INSERT only checks `auth.uid()=user_id`, not that `entry_id` belongs to the caller → cross-tenant row injection | `002_timeline_tables.sql:80-81` | add `exists (select 1 from steady_timeline_entries e where e.id = entry_id and e.user_id = auth.uid())` to `WITH CHECK` | ✅ applied |
| M2 | `storage.objects` RLS never explicitly enabled; relies on implicit platform default | `003_storage.sql:17-51` | add `alter table storage.objects enable row level security;` | ✅ applied |
| M3 | No server-side MIME/path gate on uploads; checks are client-only (`imageRules.ts`) | `003_storage.sql:31-33` | add `and (storage.extension(name) in ('jpg','jpeg','png','webp'))` to insert policy | ✅ applied |
| M4 | Edge function has no rate limiting + leaves orphaned storage objects after `deleteUser` | `steady-delete-account/index.ts:54` | storage cleanup applied; rate-limit needs a KV/DB store → documented follow-up | ⚠️ partial |
| M5 | `ci.yml` has no `permissions:` block (inherits write) | `ci.yml` | added `permissions: contents: read` | ✅ applied |
| M6 | RLS test suite self-skips without keys; no storage/edge-function coverage | `rls-security.test.ts:23-29`, `repository-supabase.test.ts:14` | fail-not-skip in CI + add storage/edge tests → documented follow-up | ⚠️ deferred |
| M7 | Deploy doesn't gate on CI; no branch protection in-repo | `deploy.yml:39` | CODEOWNERS added; branch/env protection is a repo-settings step → documented below | ⚠️ partial |

---

## Lantern (migration 009) — security posture

The Lantern module (`steady_lantern_scales/levels/images/shares`) follows the
same owner-scoped RLS rules as every other `steady_*` table: `auth.uid()`
INSERT ownership, no `USING(true)`, no anon grants. Photos live in the private
`steady-media` bucket at `{uid}/{levelId}/{uuid}{ext}` with transient signed
URLs (TTL 1h) — the timeline pattern.

One deliberate exception: **`get_shared_scale(p_token uuid)` is a
`SECURITY DEFINER` function** — the only door anon users may use, and the only
way a shared lantern is read. It is locked down:

- `set search_path = public`; `revoke all … from public`; `grant execute` to
  `anon, authenticated` only.
- Returns **text-only** data (name, levelCount, levels with label/description/
  actions). It never returns image paths, scale ids, user ids, or share rows.
- Requires a valid, un-revoked share token; a revoked or unknown token returns
  `null` (rendered as "This lantern isn't lit").
- Anon cannot select from any `steady_lantern_*` table directly — the RLS
  suite (`tests/rls-security.test.ts`) asserts owner isolation on all four
  tables and anonymous select/insert denial.

---

## Lantern Partners (migration 010) — security posture

Partners adds two tables and two RPCs. The remote model is the same
`auth.uid()`-scoped RLS as everywhere else, with one structural difference:
**a partnership is inherently two-party**, so it is the only table in the schema
scoped by a *pair* of columns rather than a single `user_id`.

`steady_lantern_partnerships` holds one row per pair — `sharer_id` owns the
scale, `partner_id` is the viewer, `status` moves `pending → active | revoked`,
with `unique (sharer_id, partner_id)` and a `sharer_id <> partner_id` check so
nobody can share with themselves. Two parties are involved, so the policies are
split by command rather than expressed as one `for all` per side:

- sharer — `for select`, `for insert with check (auth.uid() = sharer_id and
  status = 'pending')`, `for update with check (auth.uid() = sharer_id and
  status <> 'active')`, `for delete`
- partner — `for select using (auth.uid() = partner_id)`, `for update using (…)
  with check (auth.uid() = partner_id)`; no insert, no delete

The partner therefore accepts and declines, and can never put itself on the
sharer's side of a row. The sharer's UPDATE check deliberately excludes
`'active'`, so a sharer cannot accept their own invitation — the UI says
"Waiting for them to accept" and the database has to mean it. The sharer can
still move a row between `pending` and `revoked` to withdraw and, in principle,
to re-invite. Re-inviting someone who previously declined is *not* wired up
client-side yet — `addPartner` still issues a plain `insert`, so it trips
`unique (sharer_id, partner_id)` on the revoked row. The policy permits the
`update` that would fix this; the client does not issue it yet.

**Why the participant columns are locked by a trigger, not a policy.** RLS
cannot make `sharer_id`/`partner_id` immutable. A `WITH CHECK` clause only sees
the *new* row, and Postgres OR-combines the checks of every policy that applies
to the command — so a side's check pins only *its own* column. The partner
policy, pinning `partner_id` alone, therefore left `sharer_id` rewriteable on a
row the caller was invited to: `update … set sharer_id = <any uuid>, status =
'active'` passed, and combined with `find_user_by_username` (below) a user
invited *once* could re-point their own row at any other account and read that
account's whole lantern through `get_partner_status()` — a cross-tenant read of
the most sensitive data in the app. Pinning the counterpart column in the same
`WITH CHECK` does not work, for the OR reason above. A `BEFORE UPDATE` trigger
(`steady_lantern_partnerships_lock_ids`, `security definer`-free `plpgsql`,
`set search_path = public`) is the only place that can compare the old row to
the new one, so it raises `insufficient_privilege` if either column changes. It
is defence in depth: RLS still decides *which rows* a caller may touch, and the
trigger decides *how those rows may be edited*.

`tests/rls-security.test.ts` asserts both properties directly: a sharer's
`status = 'active'` write returns no rows and leaves the row `pending`, and an
invitee's re-point attempt is refused with an error and leaves both `sharer_id`
and `status` untouched.

`steady_lantern_current_levels` is plain single-owner: `unique (user_id)`
(one row per user, so a re-set replaces rather than appends), one
`for all … using (auth.uid() = user_id) with check (auth.uid() = user_id)`
policy, and no anon grant. A partner never selects this table at all — they
read it through the RPC. `level_id` FK-cascades from
`steady_lantern_levels`, so a scale edit that removes a level also clears the
status, which is the correct outcome: a level that no longer exists cannot be
presented as current. The window itself is client-side — `expires_at` is
`set_at + 60 min` (`CURRENT_LEVEL_TTL_MINUTES`) and is evaluated for display by
`currentLevelState`, with no cron, so a stale signal settles by itself.

Two `SECURITY DEFINER` functions were added. Each is `set search_path =
public`, `revoke all … from public`, and `grant execute … to authenticated`
only — never `anon` — so neither is reachable without a real account:

- **`find_user_by_username(text)`** returns a single `jsonb` object containing
  **only** `{id, username}` for a username that already exists, and never the
  caller themselves (the `u.id <> auth.uid()` clause makes self-inviting
  impossible). It exists because steady signs people in by username, which is
  the local part of their hidden Supabase email, and `auth.users` is not
  readable by authenticated clients. It is a **user-enumeration surface by
  design**: any authenticated user can confirm that a given username is
  registered and learn its account id. That is the accepted residual risk for
  an invite-by-username flow — the disclosure is one uuid, only for a name the
  caller already knows, never the email, and it is bounded by requiring an
  account.
- **`get_partner_status()`** takes **no arguments** — the caller is derived
  from `auth.uid()` inside the function, so it cannot be asked about anyone
  else, and it filters to `partner_id = auth.uid() and status = 'active'`. What
  it returns is text plus timestamps: the sharer's username, scale name, level
  count, and per-level `position` / `label` / `description` / `actions`, plus
  the sharer's current level as `setAt` / `expiresAt` and the same text fields.
  It never returns image paths, `storage_path` values, the scale id, or email
  addresses. Two uuid leaks are worth naming precisely rather than glossing:
  the entry carries `sharerId`, and the `currentLevel` object carries its own
  row `id` plus `levelId`. Those are inert — every `steady_lantern_*` table is
  RLS-scoped to its owner and no RPC accepts an id, so a partner holding one
  still cannot read a row with it. The *scale's* level objects are genuinely
  id-free, which is why the repository synthesizes `LanternLevel.id` from
  `sharerId:position` and matches the live level by position.

One deliberate lifecycle choice: the current level is **excluded from the
export bundle**. It is live, time-boxed state rather than a record, so an
export has nothing to write down — but it *is* carried across the guest →
account migration (`migrateLocal.ts` reads it straight from the local
repository and re-sets it after the scale save, because its `levelId` points
into the levels that migration just wrote). Partnerships are never migrated:
they are remote-only from the start.

Neither RPC is called from `tests/rls-security.test.ts` — that harness signs
in with the anon key plus a password, which is not the JWT shape PostgREST
requires for a `SECURITY DEFINER` call, and both flows are already exercised
end-to-end by `tests/parity.suite.ts`. The table-level RLS for both new tables
is covered there; `steady_lantern_partnerships` is asserted longhand rather
than through the shared `TableSpec` harness, because the harness assumes a
single `user_id` owner and a two-party table inverts half of its assertions.

---

## Low / Info

- **L1** — Login lockout is client-side only (`authCore.ts`); server brute-force relies
  on Supabase's platform rate limits. No in-repo fix.
- **L2** — Edge function imports `@supabase/supabase-js@2` from `https://esm.sh/`
  (unpinned). ✅ pinned to `@2.112.3`.
- **L3** — Public Supabase demo JWTs still on the stale `wp10-retro-skin` branch
  `ci.yml`. Non-secret (local-stack defaults). Hygiene: delete stale branches.
- **L4** — Hash-route referrer leak. ✅ closed by the H1 `referrer no-referrer` meta.

---

## Verified clean (do not re-report)

- **No secrets ever committed** — full scan of all 23 branches, `git log --all -p`
  (~4.8 MB), stash, reflog. `.env` never committed; only `.env.example` with placeholders.
  The only JWT-like strings are Supabase's public demo JWTs (`iss: supabase-demo`,
  `exp=1983812996`) pointing at `127.0.0.1:54321`, on stale branch CI commits
  (`a753b91`, `1a3ce29`), removed from `main` in `e52982b`. No rotation needed.
- **No XSS sinks** — zero `dangerouslySetInnerHTML` / `innerHTML` / `eval` /
  `document.write` / `postMessage` in `src/`. User content rendered as React text
  children. No file-import vector exists.
- **RLS correct on all `steady_*` tables** — owner-scoped policies, `auth.uid()`-derived
  INSERT ownership, no `USING(true)`, no anon grants, no `SECURITY DEFINER` functions.
- **Edge function has no IDOR** — requires bearer token, verifies via `getUser`, deletes
  `auth.uid()` from the token, never a body-supplied id.
- **No open redirects / tabnabbing** — no `target="_blank"`, no `javascript:` URLs;
  external nav uses a hardcoded `BLOOM_URL` constant.
- **Service worker** — auth/data API is `NetworkOnly`; only media is cached.
- **Fonts self-hosted**; no third-party CDN scripts/analytics. `dist/` ships no
  sourcemaps, no `.env`. No `vite` `server.proxy`.
- **`deploy.yml`** already has least-privilege permissions; no `pull_request_target`.
- **`npm audit`** — 10 advisories, all in devDependencies, all traced to `@lhci/cli`
  chain (extract-zip CVSS 8.1, tmp, uuid, puppeteer-core, lighthouse, inquirer). npm's
  suggested `@lhci/cli@0.1.0` "fix" is a bogus downgrade. **Prod deps (16) = 0 vulns.**

---

## Prioritized plan (order agreed)

1. ~~C2 — service-role key out of the public CI path~~ ✅
2. ~~H1 + C1 — CSP meta, then session persistence off~~ ✅
3. ~~M2 + M3 + M1 — storage hardening~~ ✅
4. ~~H3 + H4 + M5 — SHA-pin, dependabot, npm audit, permissions~~ ✅
5. M4 — storage cleanup done; rate-limit deferred (needs KV/DB store)
6. M7 — CODEOWNERS done; branch/env protection is a manual repo-settings step

---

## Follow-ups requiring repo settings (manual, cannot be done in-code)

To fully close M7 and M6:

1. **Branch protection on `main`** (GitHub → Settings → Branches):
   - Require pull requests + ≥1 approving review.
   - Require status checks: `typecheck`, `lint`, `unit`, `build`, `rls`, `audit`.
   - Require branches up to date; disallow force push.
2. **Protect the `github-pages` environment** (Settings → Environments): require the
   `build` + CI checks to pass and require reviewers before deploy.
3. **M6 follow-up:** make `rls-security.test.ts` fail (not skip) when keys are absent in
   CI, and add storage-bucket isolation + edge-function auth tests.
4. **M4 follow-up:** add a real rate-limit store (Upstash Redis or a Postgres-backed
   cooldown table) to `steady-delete-account`; consider requiring a fresh sign-in before
   deletion.
5. **H2 follow-up:** decide on WebCrypto at-rest encryption for Dexie + reduce/remove SW
   media caching.
6. **Hygiene:** delete the stale `wp10-retro-skin` branch (L3).

---

## Files changed in this pass

- `docs/SECURITY_AUDIT.md` (this report)
- `index.html` — CSP + referrer meta (H1)
- `src/config/supabase.ts` — session persistence off (C1)
- `.github/workflows/ci.yml` — permissions, key scoping, SHA-pins, audit job (C2/H3/H4/M5)
- `.github/workflows/deploy.yml` — SHA-pins (H3)
- `.github/dependabot.yml` — new (H4)
- `supabase/migrations/20260815190001_002_timeline_tables.sql` — M1
- `supabase/migrations/20260815190002_003_storage.sql` — M2 + M3
- `supabase/migrations/20260821000000_006_security_hardening.sql` — new (M1/M2/M3 for already-migrated DBs)
- `supabase/functions/steady-delete-account/index.ts` — esm.sh pin + storage cleanup (M4/L2)
- `.github/CODEOWNERS` — new (M7)
