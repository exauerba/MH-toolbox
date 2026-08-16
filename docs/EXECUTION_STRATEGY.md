# Steady — Subagent Execution Strategy

**Partners with:** `docs/BUILD_PLAN.md` (the what). This doc is the **how** — how subagents run, who owns what, and where the gates are.
**Status:** Wave 1–2 merged on `main` (WP0, WP2 partial, WP3, WP4, WP5 partial, WP7, plus the `wp10-retro-skin` skin pass). See `BUILD_PLAN.md §0` for the full WP status table.

---

## 1. Roles

| Role | Holder | Responsibilities |
|------|--------|------------------|
| **Orchestrator** | You (the agent session) | Holds the contract (`data/types.ts`, `ToolboxRepository`), writes every agent brief, creates/merges branches, runs review gates, resolves cross-WP conflicts, does the release |
| **Implementer agents** | One `general` subagent per WP | Implement exactly the WP in their brief; run local verification; report diff + test results back |
| **Design agent** | Design-specialist agent | Direction-setting (WP3) + per-phase design review checkpoints |
| **Reviewer** | You (human) | Approves design direction (§15 gate), does manual smoke tests at wave gates, gives final go-live |

Orchestrator never does WP implementation itself; agents never merge or write briefs. Clear separation = no duplicated work, no stepping on each other.

---

## 2. Branch & merge protocol

- Every WP works on its own branch: `wp/<nn>/<slug>` (e.g. `wp/06/energy-jar`), branched from the latest `main`.
- **Merge is orchestrator-only**, and only when:
  1. `npm run typecheck` + `npm run lint` + `npm test` (unit/component/RLS security) are green,
  2. Playwright E2E for that WP's own flows passes,
  3. Orchestrator reviewed the diff against the ownership map (§4) — no contract files touched without approval (§3).
- After merge: branch deleted, todo list updated, next wave's briefs written from the *merged* state (not the branch state — prevents drift).

---

## 3. Contract ownership & change control

The load-bearing files — `src/data/types.ts`, `src/data/repository.ts` — are **orchestrator-owned, agent read-only**.

- Feature agents that need a different type/interface **file a contract-change request** in their report (what, why, affected WPs). They do **not** edit the contract themselves ("flag, don't fix").
- Orchestrator applies approved changes (or hands to the WP1 agent), then re-issues affected briefs. Every contract change gets its own unit-test update + parity-suite re-run.
- Rationale: the entire bug-free guarantee rests on the parity test suite running the same tests against both backends. Contract drift is the #1 way that guarantee silently rots.

---

## 4. File-ownership map (merge-conflict prevention)

| Path | Owner | Others |
|------|-------|--------|
| `src/data/**` (except types/repository) | WP1 | read-only |
| `src/data/types.ts`, `src/data/repository.ts` | Orchestrator | read-only |
| `supabase/migrations/**`, `supabase/functions/**` | WP2 | read-only |
| `src/design/**` (tokens, primitives) | WP3 | read-only once approved |
| `src/app/**` (shell, providers, router) | WP4 | read-only |
| `src/tools/tools.config.ts` | WP4 (skeleton) | WP5 adds hub rendering; features read-only |
| `src/features/hub/**` | WP5 → WP11 (reorder) | |
| `src/features/jar/**` | WP6 | |
| `src/features/timeline/**` | WP9 | |
| `src/features/settings/**` | WP8 | |
| `src/data/migrateLocal.ts` | WP10 | |
| `e2e/<wp>-*.spec.ts` | Owning WP | WP12 consolidates/extends |
| `vite.config.ts`, `playwright.config.ts`, CI workflows | WP0 | read-only |

Rule: two agents never write the same file in the same wave. When a later WP legitimately extends an earlier file (WP11 → hub, WP12 → e2e), it lands in a *later* wave — sequential, no conflict.

> **Current-layout note (2026-08-16):** the plan's `src/features/jar/**` and `src/features/timeline/**` do not exist yet — the Jar and Timeline previews live in `src/features/tools/JarScreen.tsx` and `src/features/tools/TimelineScreen.tsx`. WP6/WP9 should either move into their own folders (matching the plan) or the ownership map should be updated to `src/features/tools/**`; decide at WP6 kickoff.

---

## 5. Wave-by-wave execution

```
Wave 1  WP0 ───────────────────────────► main        ✅ merged
             └──▶ WP2 ║ WP3 ───────────► main        ✅ merged (WP2 partial: no delete fn)
                  └──▶ WP1 ────────────► main        ❌ not started
             GATE: design direction (user) + contract review (orchestrator)

Wave 2  WP4 ───────────────────────────► main        ✅ merged
             └──▶ WP5 ║ WP6 ║ WP7 ║ WP8► main        ⚠️ WP5/WP8 partial, WP6 preview, WP7 merged
             GATE: design checkpoint #2 + user smoke test

Wave 3  WP9 ║ WP10 ║ WP11 ────────────► main         ⚠️ WP9 preview; WP10 (migration) + WP11 not started
             GATE: design checkpoint #3 + user smoke test

Wave 4  WP12 (solo, hardening) ───────► main         ❌ not started
             GATE: full audit + user manual QA (WP13 QA script)
             WP13 (release) ───────────► main         ❌ not started   [needs explicit user go-live yes]
```

Notes:
- **Parallelism cap: 2–3 concurrent agents.** Enough throughput; low merge risk; review quality stays high.
- WP3 (design) starts in Wave 1 as a parallel track — its *output* (tokens, styleguide) is what WP6/WP9 need; it must be approved at the Wave-1 gate before Wave-2 agents start.
- WP1 has two halves: types/interface/Dexie/fake+parity harness can start right after WP0 (parallel with WP2); the Supabase implementation + integration tests land after WP2's tables exist.
- WP12 is **solo by design** — broad ownership (every route, both modes, Lighthouse, axe, console sweep). Parallelism here would cause conflict, not speed.
- **Naming caveat:** the merged `wp10-retro-skin` branch is a *skin* pass, not the plan's WP10 (guest→account migration). The migration WP10 is still unstarted and belongs in Wave 3.

---

## 6. Review gates

| Gate | When | Who | What must pass | Status |
|------|------|-----|----------------|--------|
| G1 — Design direction | End of Wave 1 | You | Styleguide + hero visuals approved (§15) — *"would I hand this to a dysregulated person?"* | ✅ passed (WP3 merged) |
| G1b — Contract review | End of Wave 1 | Orchestrator | types.ts/repository.ts stable; parity suite green on both backends | ⏳ pending (WP1 not started) |
| G2 — Design checkpoint | End of Wave 2 | Design agent + you | Built hub/jar/bloom/settings match approved direction; tokens used, not reinvented | ⏳ pending (jar/settings still preview) |
| G3 — Design checkpoint | End of Wave 3 | Design agent + you | Timeline + migration + reorder match direction | ⏳ pending |
| G4 — Full audit | End of WP12 | You | Lighthouse budgets, axe, manual QA script, E2E green in both modes, no console errors | ⏳ pending |
| G5 — Go-live | Before WP13 merge | You | Explicit "yes" to public Pages deploy | ⏳ pending |

A gate failing means the wave's fixes go back to the owning agent (or the design brief, at G1) — never silently carried forward.

---

## 7. Agent brief template (used for every WP launch)

```
TASK: Implement <WP name> per the spec below.
1. READ FIRST: docs/BUILD_PLAN.md §<relevant>, docs/EXECUTION_STRATEGY.md §4 (ownership map),
   <contract files>, <design tokens/styleguide if applicable>.
2. SCOPE (write these files ONLY): <exact paths>
3. FORBIDDEN (read-only, flag don't fix): <paths incl. types.ts, repository.ts, others' dirs>
4. SPEC: <WP content distilled from plan §10 + feature spec §6>
5. VERIFY: npm run typecheck && npm run lint && npm test
            npx playwright test e2e/<wp>-*.spec.ts
6. REPORT BACK: what you built, test results, any contract-change requests,
   anything outside your scope you needed but couldn't touch.
7. DoD: from plan §10 (definition of done). Visual WPs: include design-checkpoint items.
```

Each brief pins the **exact API surface** the agent consumes (hook signatures, route names, token names) so parallel agents build against the same reality even before dependencies merge.

---

## 8. Conflict & stall handling

- **Contract drift** (agent edits types.ts): reject the branch, re-issue brief with read-only contract re-emphasized; route the change through §3.
- **Merge conflict in an owned file**: orchestrator resolves against the ownership map (the file's owner wins; the other branch's intent is preserved via a contract change if needed).
- **Stalled agent** (no report, wrong-scope work): orchestrator re-briefs with tighter scope; if a WP proves bigger than briefed, split it (WP briefs are written to be splittable — each feature is a folder).
- **Local Supabase unavailable**: integration + RLS tests are CI-gated (Docker `supabase start`); agents may skip local Supabase runs only if CI passes, and must say so in the report.

---

## 9. Definition of Done (every WP, unchanged from plan §10)

Code merged on feature branch → CI green (typecheck, lint, unit+component+RLS tests) → E2E for its flows passes → design-review sign-off (visual WPs) → no open console errors → todo list updated.
