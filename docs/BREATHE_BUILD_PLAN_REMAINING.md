# Breathe — Remaining Build Plan

Status: **✅ COMPLETE** — all items shipped in `bc92239` (migration + tests) and this session (styleguide chip, plan finalization).

## Context

The breathe tool shipped on `main` (WP0–WP8 core, e2e, RLS specs). One functional gap from the original plan's WP1 was never implemented: **guest → account migration does not carry breathe data**. `MigrationPrompt.tsx` calls `migrateLocalToSupabase` on sign-in, so a guest's medications, check-ins, and dose logs are silently dropped when they log in.

## Remaining work

### 1. `src/data/migrateLocal.ts` — migrate breathe data

- Add `breatheMeds`, `breatheCheckins`, `breatheDoseLogs` to `MigrationResult['counts']` and `zeroCounts()`.
- Add the three breathe arrays to `hasLocalData()`.
- Insert loops before the `localDataImportedAt` stamp, in FK-safe order:
  1. `breatheMeds` → `remote.saveBreatheMed({ name, medType, reminderHour }, med.id)` — preserve the med id as the FK anchor for dose logs.
  2. `breatheDoseLogs` → `remote.addBreatheDoseLog({ medId, date, time })` — `medId` stays valid because med ids were preserved.
  3. `breatheCheckins` → `remote.saveBreatheCheckin({ date, peakFlow, symptoms, sleep, activity, note }, checkin.id)` — upsert-safe, idempotent on re-run.

All three remote methods already support this (`SupabaseRepository.ts`: `saveBreatheMed` / `saveBreatheCheckin` / `addBreatheDoseLog`).

### 2. `tests/migrate-local.test.ts` — extend coverage

- Add the 3 keys to the local `zeroCounts` const.
- Extend the "migrates all data" test: seed 1 med (fixed UUID) + 1 check-in + 1 dose log referencing the med; assert all three land on `remote`, med id preserved, dose-log `medId` matches, and `result.counts` includes the new keys.
- Add a breathe-only test (single med, no other data) asserting `migrated: true` (covers `hasLocalData`).

## Verification

```
npm run typecheck
npm run test
npm run lint
npm run build
```

`npm run test:rls` and `npx playwright test e2e/breathe.spec.ts` are env-gated / unaffected by this work.

## Out of scope (deferred)

- ~~Finalizing `docs/BREATHE_BUILD_PLAN.md`~~ — done: marked COMPLETE with a shipped-vs-spec reconciliation.
- ~~Styleguide Chip tone row missing the `breathe` chip~~ — done: `<Chip tone="breathe">breathe</Chip>` added to the Chip `DemoCard`.