# Plan: "Daily Breath" — Medication & Symptom Tracker for steady

> **Status: ✅ COMPLETE** — shipped on `main` (WP0–WP8, e2e, RLS specs, guest→account migration). The spec below is the original plan and is kept as a historical record; the **Shipped vs spec** section documents where the implementation intentionally diverged (notably the Bloom visual overhaul).

> **Scope:** A new in-app tool modeled on **bloom** (`pink-mood-tracker`) for scoring and visualization, scoped to the inhaler + asthma demo: dose recording, symptom check-ins, bloom-style analytics, plus a composite control score. Persists via steady's existing contract (Dexie when signed out, the shared Supabase project when signed in — never touching bloom's tables). Ships with a styleguide hero visual matching the cozy pixel retro vibe.

---

## Shipped vs spec (reconciliation)

The feature shipped with a **Bloom visual overhaul** (airy pink, tactile journal, ritual-first check-in) that intentionally diverged from parts of this spec. Key deltas:

| Aspect | Spec (below) | Shipped |
|---|---|---|
| Medication model | `kind: 'rescue' \| 'preventer'`, `dailyPrescription`, `puffsPerDose` | `medType: 'controller' \| 'reliever' \| 'other'`, `reminderHour` (opt-in, 0–23) |
| Dose log | `medicationId` + `puffs` count | `medId` + `date` + optional `time` (no puff count) |
| Check-in | 4 symptoms rated 1–7 + `nightWaking` | One per day: `peakFlow` (L/min), `symptoms`/`sleep`/`activity` rated 1–5 (nullable), `note` |
| Control score | Composite: symptom burden (40) + night waking (20) + rescue puffs (40), thresholds 80/50 | `controlState()`: `100 − symptomAvg×14` + preventer-coverage bonus; labels `Controlled` / `Partly controlled` / `Uncontrolled` / `No data` |
| Accent ramp | Sky/ice-blue (`breathe-*`) | Lilac/periwinkle ramp (Bloom overhaul) |
| Charts | Chart.js trend + time-of-day + adherence bars + correlation heatmap | Chart.js v4 trend + time-of-day charts; DOM-based sections for the rest |
| Tables | `steady_medications`, `steady_dose_logs`, `steady_symptom_checks` | `steady_breathe_meds`, `steady_breathe_dose_logs`, `steady_breathe_checkins` (RLS owner policies, unique `(user_id, date)` on check-ins) |
| Migration | Preserve med ids as dose-log FK anchor | Implemented in `src/data/migrateLocal.ts` (meds → dose logs → check-ins, idempotent) |

Verification: `typecheck`, `lint`, `test` (185 passing), `build` all green. `test:rls` and `e2e/breathe.spec.ts` are env-gated.

---

## 0. Tool identity

| Aspect | Decision |
|---|---|
| `ToolId` / route | `'breathe'` → `/tools/breathe` |
| Name | **Daily Breath** (tagline: *"Your inhaler and your symptoms, in one breath."*) |
| Accent | New `breathe` family — soft sky/ice-blue ramp. Must be added to **both** `src/index.css` `@theme` (light + dark) and `design/tokens.ts` (colors + `toolAccents`); `tokens.test.ts` enforces the sync. Accent-600 ≥ 5:1 on light (AA), like the other ramps. |
| Icons | New `inhaler` stroke SVG in `design/icons.tsx` + pixel sprite in `design/pixelSprites.ts`. |
| `Chip tone` | Add `'breathe'` to the Chip component's tone union. |
| `Tile accent` | Add `'breathe'` to the Tile component's accent support. |

---

## 1. Contract additions (`src/data/types.ts` → `ToolboxRepository`)

### New domain types (camelCase, matching existing style)

```ts
export type MedicationKind = 'rescue' | 'preventer'

export interface Medication {
  id: string
  name: string                          // e.g. "Salbutamol"
  kind: MedicationKind                  // rescue | preventer
  dailyPrescription: number | null      // null = PRN/as-needed (rescue)
  puffsPerDose: number                  // e.g. 2
  createdAt: string
}

export interface MedicationInput {
  id?: string
  name: string
  kind: MedicationKind
  dailyPrescription?: number | null
  puffsPerDose?: number
}

export interface DoseLog {
  id: string
  date: string                          // YYYY-MM-DD, day-window attribution at write
  time: string                          // 'HH:MM' for time-of-day bucketing
  medicationId: string
  puffs: number
  createdAt: string
}

export interface DoseLogInput {
  date: string
  time?: string
  medicationId: string
  puffs: number
}

export type SymptomId = 'wheeze' | 'cough' | 'chestTightness' | 'shortnessOfBreath'

export interface SymptomCheck {
  id: string
  date: string
  time: string                          // 'HH:MM'
  severities: { [k in SymptomId]?: number }  // 1–7, higher = worse
  nightWaking: boolean                  // asthma woke you overnight
  note: string | null
  createdAt: string
}

export interface SymptomCheckInput {
  date: string
  time?: string
  severities: { [k in SymptomId]?: number }
  nightWaking?: boolean
  note?: string | null
}
```

### New repository methods

```ts
// Medications
listMedications(): Promise<Medication[]>
saveMedication(m: MedicationInput): Promise<Medication>  // upsert by id
deleteMedication(id: string): Promise<void>              // cascades dose logs

// Dose logs
listDoseLogs(): Promise<DoseLog[]>                       // newest first
addDoseLog(l: DoseLogInput): Promise<DoseLog>
updateDoseLog(id: string, l: Partial<DoseLogInput>): Promise<void>
deleteDoseLog(id: string): Promise<void>

// Symptom checks
listSymptomChecks(): Promise<SymptomCheck[]>
saveSymptomCheck(c: SymptomCheckInput): Promise<SymptomCheck>  // upsert by id
deleteSymptomCheck(id: string): Promise<void>
```

### Four-way implementation

| File | What to add |
|---|---|
| `src/data/types.ts` | All types above |
| `src/data/repository.ts` | All methods above on `ToolboxRepository` |
| `src/data/local/db.ts` | Dexie stores: `medications: 'id'`, `doseLogs: 'id, medicationId'`, `symptomChecks: 'id'` |
| `src/data/local/LocalRepository.ts` | Implement all methods via Dexie |
| `src/data/testing/fakeRepository.ts` | Map-based mirrors of all methods |
| `src/data/supabase/SupabaseRepository.ts` | snake_case `*FromRow` mappers, Supabase queries |
| `supabase/migrations/` | New additive `steady_medications`, `steady_dose_logs`, `steady_symptom_checks` tables with RLS owner policies (never touch bloom's tables) |
| `src/data/migrateLocal.ts` | New loops preserving medication IDs (FK for dose logs), update `hasLocalData`, `zeroCounts`, `MigrationResult.counts` |
| `src/data/repository.ts` | Extend `ExportBundle` with `medications`, `doseLogs`, `symptomChecks` arrays |
| All 3 repo implementations | Extend `exportAll` and `deleteAllData` for the 3 new collections |
| `tests/parity.suite.ts` | New cases: CRUD for meds/symptoms/doses, cascade delete, export includes new collections |

---

## 2. Scoring module — faithful bloom port + control score

**File:** `src/features/breathe/scoring.ts` (pure, unit-testable)

### Bloom-ported metrics

| Function | Source port | Formula / rule |
|---|---|---|
| `dailySymptomBurden(checks, date)` | bloom inline | Mean of the day's 1–7 severities (null if none) |
| `symptomTrend(checks, from, to)` | `charts.js:rollingAverage` | 7-day trailing window, **≥3 rated days** per window |
| `normalBand(checks, from, to)` | `charts.js:normalBand` | mean ± 1 SD (population), `null` if **<5 points** |
| `flipValue(v)` | `charts.js:flipValue` | `8 − v` — applies to rescue-use (fewer puffs = "up is good") |
| `adherencePct(doseLogs, med, date)` | bloom custom | `%` of prescribed daily puffs taken for a preventer |
| `adherenceHistory(doseLogs, med, from, to)` | bloom custom | Array of daily adherence % values |
| `rescuePuffsPerDay(doseLogs, date)` | bloom custom | Sum of rescue puffs on a given day |
| `whatChanged(checks, doseLogs, preventerId, from, to)` | `viz-insights.js:renderHelped` | Mean daily symptom burden on **preventer-adherent vs non-adherent** days; classification `neutral` (<0.3 delta) / `better` / `worse` |
| `spearman(a, b)` | `viz-insights.js:spearman` | Full port incl. average-rank tie-breaking |
| `rankValues(values)` | `viz-insights.js:rankValues` | Ranks with average-rank tie-breaking |
| `pearson(x, y)` | `viz-insights.js:pearson` | Pearson on (already-ranked) values |
| `correlationMatrix(metrics, from, to)` | bloom custom | Pairwise Spearman among severities + rescue puffs, **min 5 paired days** ("—" below) |

### Composite control score (NEW — not in bloom)

```
controlScore(checks, doseLogs, medications, from, to) → { score: number, state: ControlState }

score (0–100, higher = better):
  - Symptom burden (0–40):  (8 − avgSeverity) / 7 × 40    [avg=1 → 40, avg=7 → 5.7]
  - Night waking (0–20):    woke = 0, did not wake = 20
  - Rescue puffs/day (0–40): 0→40, 1→30, 2→20, 3→10, ≥4→0

Thresholds (in constants.ts):
  ≥80 → 'well-controlled'
  50–79 → 'partly-controlled'
  <50 → 'poorly-controlled'
```

**Control states** (`controlStates.ts`, mirroring `jarStates.ts`):

| State | Icon | Label | Copy |
|---|---|---|---|
| `well-controlled` | `shield` | Well controlled | *"Your symptoms are staying low. Keep doing what works — you've got this."* |
| `partly-controlled` | `gauge` | Partly controlled | *"Some days are tougher than others. A check-in with your prescriber might help fine-tune things."* |
| `poorly-controlled` | `alert` | Needs attention | *"Your symptoms are frequent. It's worth talking to your prescriber soon — you deserve to breathe easier."* |

**Constants** (`constants.ts`):

```ts
export const SYMPTOM_IDS: SymptomId[] = ['wheeze', 'cough', 'chestTightness', 'shortnessOfBreath']
export const SYMPTOM_LABELS: Record<SymptomId, string> = {
  wheeze: 'Wheezing',
  cough: 'Coughing',
  chestTightness: 'Chest tightness',
  shortnessOfBreath: 'Shortness of breath',
}
export const MIN_TREND_DAYS = 3        // min rated days for rolling avg window
export const MIN_BAND_POINTS = 5       // min total points for normal band
export const MIN_PAIRED_DAYS = 5       // min paired days for correlation cell
export const MIN_HELPED_DAYS = 3       // min days per group for whatChanged
export const CONTROL_THRESHOLDS = { well: 80, partly: 50 } as const
```

---

## 3. Feature folder & screens

**Folder:** `src/features/breathe/`

### File manifest

| File | Purpose |
|---|---|
| `BreatheScreen.tsx` | Main tool screen (jar-style header, three areas) |
| `scoring.ts` | All bloom-ported math + control score (pure) |
| `controlStates.ts` | Control state metadata (icon, label, copy) |
| `constants.ts` | Thresholds, symptom IDs/labels, defaults |
| `chartData.ts` | Convert domain models → Chart.js datasets |
| `demoData.ts` | Seed ~14 days of realistic sample data |
| `demoData.test.ts` | Verify seed data shape |
| `scoring.test.ts` | Ported bloom-formula assertions |
| `BreatheScreen.test.tsx` | Component test with FakeRepository |
| `e2e/breathe.spec.ts` | Playwright end-to-end spec |

### Screen layout (`BreatheScreen.tsx`)

Jar-style header (back `IconButton` → `navigate('/')` + `<Tile accent="breathe" icon="inhaler" />` + `<h1>Daily Breath</h1>`). Three areas:

#### Area 1 — Today: dose logging

- Medication `Select` (populated from repo)
- Puff `Stepper` (defaults to med's `puffsPerDose`, min 1, max 6)
- Time defaulted to now (`HH:MM`)
- Quick-add `Button` → `addDoseLog` through repository
- Today's doses list (same row pattern as JarScreen's today log): med icon + name, puff count, time, edit/delete buttons
- **Preventer adherence bar**: if a preventer med exists, show today's adherence as a `ProgressBar` (puffs taken / daily prescription)

#### Area 2 — Today: symptom check-in

- 4 symptoms rated 1–7 using a compact severity row per symptom:
  - Each row: label + 7 small circular buttons (bloom-style scale, restyled with design tokens)
  - 1 = mild, 4 = moderate, 7 = severe (anchor labels)
  - Selected button filled with `breathe-400`, others outlined
- **Night waking toggle**: *"Woken by asthma?"* (boolean)
- Optional note (≤140 chars, `TextArea`)
- Save button → `saveSymptomCheck` through repository
- Today's existing check-ins listed (edit/delete per check-in)

#### Area 3 — Visualize (below the fold, scrollable)

All bloom-style analytics:

| Section | Implementation |
|---|---|
| **Control card** (top) | Score + classification banner (`Chip` + icon + label + copy, `role="status"`) |
| **Trend chart** | Chart.js: symptom burden rolling average line + normal band plugin + raw dots plugin; rescue puffs on flipped scale |
| **Time-of-day chart** | Chart.js: dose puffs by Morning 5–11 / Afternoon 12–16 / Evening 17–21 / Night 22–4 |
| **Adherence bars** | Last-7-days preventer adherence, pure-CSS bars (jar pattern) |
| **Insight card** | "Symptoms on preventer days vs not" — big delta + plain-language sentence |
| **Correlation heatmap** | DOM table: Spearman values with strength/colour + always-readable numbers |

#### Area 4 — Manage (collapsible or separate section)

- Medications list: name, kind, prescription, puffs per dose, rename/delete
- Add medication form: name, kind (rescue/preventer), prescription, puffs per dose
- **Default seed**: Salbutamol (rescue, PRN, 2 puffs/dose), Beclometasone (preventer, 2 puffs × 2 daily)

---

## 4. Visualization — Chart.js + DOM insight cards

### Dependency

- `npm i chart.js` (v4) — **skip** `chartjs-adapter-date-fns` (use category labels for the ~14-day demo window)
- New thin React wrapper: `src/design/charts/Chart.tsx` (primitives-style, following design system barrel pattern)
  - Uses `usePrefersReducedMotion()` → `animation: false` when reduced motion
  - Always paired with text summaries for a11y (never chart-alone)
  - Registered as a design primitive for future reuse (PRD Phase 3 advanced stats)

### Chart.js plugins (ported from bloom)

- `normalBandPlugin` — shaded mean±1SD band, drawn before datasets
- `rawDotsPlugin` — small raw check-in dots, drawn after datasets
- Both ported from `charts.js` lines 28–82 to work with Chart.js v4

### Chart.js config

- Category x-axis labels (day names)
- Y-axis: symptom severity 1–7 (autoscaled via `niceYRange` port)
- Rescue puffs: secondary y-axis, flipped scale (fewer = higher on chart)
- Colours from `breathe` accent ramp (lighter for bands, solid for lines)
- Tooltip: shows date, value, medication name

### DOM insight cards

- **"What helped"**: delta number (large) + explanatory sentence (port of `renderHelped`)
- **Correlation heatmap**: HTML `<table>`, cells coloured by Spearman strength, numeric value always visible (not colour-alone)

---

## 5. Demo data

**File:** `src/features/breathe/demoData.ts`

- **"Try a sample fortnight"** action (shown in empty state + Manage)
- Generates ~14 days of realistic data programmatically (deterministic — same data each time)
- Includes a good-symptom/controlled stretch (days 1–7) and a flare-up stretch (days 8–14) so rolling average, normal band, insight delta, correlations, and control states all show varied data
- Writes through the repository (`saveMedication` + `addDoseLog` + `saveSymptomCheck`)
- Clearly labelled: *"Sample data — you can remove it anytime"*
- **"Remove sample data"** affordance wipes only the 3 new collections (not jar/timeline data)

---

## 6. Styleguide — hero visual + accent ramp

### 6a. `inhaler` icon (stroke SVG)

Add to `src/design/icons.tsx`:

```ts
inhaler: () => (
  <g {...strokeProps()}>
    {/* Canister (vertical cylinder) */}
    <rect x="9" y="2" width="6" height="8" rx="1.5" />
    <path d="M10 2h4" />
    {/* Mouthpiece (horizontal L-extension) */}
    <rect x="9" y="10" width="6" height="4" rx="1" />
    <rect x="7" y="14" width="10" height="3" rx="1.5" />
    {/* Actuation dot */}
    <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
  </g>
),
```

### 6b. `inhaler` pixel sprite

Add to `src/design/pixelSprites.ts`:

```ts
inhaler: [
  '................',
  '................',
  '.....XXXXXX.....',
  '.....X....X.....',
  '.....X..X.X.....',
  '.....X....X.....',
  '.....X..X.X.....',
  '.....XXXXXX.....',
  '.....XXXXXXXX...',
  '.....XXXXXXXX...',
  '....XXXXXXXXXX..',
  '....XXXXXXXXXX..',
  '....XXXXXXXXXX..',
  '.....XXXXXXXX...',
  '................',
  '................',
],
```

### 6c. `breathe` accent tokens

Add to `src/index.css` `@theme` block (light + dark):

```css
/* Light */
--color-breathe-50:  #f0f7fa;
--color-breathe-100: #daedf5;
--color-breathe-200: #b5dbe9;
--color-breathe-300: #82c1d8;
--color-breathe-400: #5aadca;
--color-breathe-500: #3d8fb0;
--color-breathe-600: #2d6e8a;
--color-breathe-700: #1f4f65;
--color-breathe-800: #163a4a;
--color-breathe-900: #0f2a35;

/* Dark */
--color-breathe-200: #82c1d8;
--color-breathe-300: #5aadca;
--color-breathe-400: #3d8fb0;
```

Add to `src/design/tokens.ts`:

```ts
// In colors:
breathe: {
  50:  '#f0f7fa',
  100: '#daedf5',
  200: '#b5dbe9',
  300: '#82c1d8',
  400: '#5aadca',
  500: '#3d8fb0',
  600: '#2d6e8a',
  700: '#1f4f65',
  800: '#163a4a',
  900: '#0f2a35',
},

// In toolAccents:
breathe: { family: 'breathe', label: 'sky blue' },

// In colorsDark:
breathe: { 200: '#82c1d8', 300: '#5aadca', 400: '#3d8fb0' },
```

**Contrast check:** breathe-600 (#2d6e8a) on canvas (#faf6f1) = ~5.2:1 ✓ AA. breathe-700 (#1f4f65) on canvas = ~7.8:1 ✓ AAA.

### 6d. Chip + Tile support

- Add `'breathe'` to the Chip component's `tone` union
- Add breathe tone styles: `bg-breathe-100 text-breathe-700 dark:bg-breathe-300/20 dark:text-breathe-300`
- Ensure Tile component accepts `accent="breathe"` and renders the correct icon tile background

### 6e. `BreatheHero` component

**File:** `src/design/hero/BreatheHero.tsx`

Following the exact pattern of `JarHero.tsx`:

```tsx
export function BreatheHero() {
  // Interactive demo state
  const [controlState, setControlState] = useState<ControlState>('well-controlled')
  const [puffs, setPuffs] = useState(0)
  const [severity, setSeverity] = useState(3)

  // Mock data for bars, history, patterns
  // ...

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Card variant="raised" padding="lg" className="pixel-card flex-1">
        {/* Header: pixel-tile + icon + title */}
        {/* Control state banner (never colour-alone: chip + icon + label + copy) */}
        {/* Today's doses (mock log with pixel icons) */}
        {/* Symptom severity row (7-button scale, interactive) */}
        {/* Adherence bar (last 7 days, CSS bars) */}
        {/* Quick-add demo (stepper + button) */}
        {/* Correlation mini-table (mock) */}
      </Card>

      <SpecPanel
        owner="WP · Daily Breath"
        title="Daily Breath hero visual"
        className="lg:w-80 xl:w-96"
        sections={[
          { heading: 'Structure', items: [...] },
          { heading: 'Tokens', items: [...] },
          { heading: 'States & copy (verbatim)', items: [...] },
          { heading: 'Severity scale', items: [...] },
          { heading: 'Reduced motion', items: [...] },
        ]}
      />
    </div>
  )
}
```

Key design details:
- Uses `pixel-card` class on the outer Card
- Uses `pixel-tile` class on the accent icon tile
- Uses `pixel-btn` class on the quick-add button
- Breathe accent colours throughout (`breathe-100`, `breathe-400`, `breathe-600`, `breathe-700`)
- Interactive: SegmentedControl for control state switcher, Stepper for puffs, severity buttons clickable
- Mock data shows: 2 doses logged today, 1 symptom check-in, 7-day adherence bars, a mini correlation table
- SpecPanel sections mirror JarHero's: Structure, Tokens, States & copy, Quick-add, Reduced motion

### 6f. Styleguide updates (`src/design/styleguide/Styleguide.tsx`)

#### Colour section — add breathe ramp

Inside the "Per-tool accents" `DemoCard`, add a fourth column:

```tsx
<div>
  <p className="mb-3 text-sm font-extrabold text-ink">Daily Breath — sky</p>
  <div className="grid grid-cols-4 gap-2">
    {Object.entries(colors.breathe)
      .filter(([step]) => step !== '900')
      .map(([step, hex]) => (
        <Swatch key={step} name={step} hex={hex} fg={step >= '500' ? '#fffdfa' : '#163a4a'} />
      ))}
  </div>
  <RampNote>Text uses <code>breathe-700</code> on light fills; <code>breathe-500</code> fills never carry text.</RampNote>
</div>
```

#### Hero visuals section — add BreatheHero

After the HubHero block, add:

```tsx
<div>
  <h3 className="mb-1 text-2xl font-extrabold text-ink">Daily Breath</h3>
  <p className="mb-5 max-w-2xl text-base leading-relaxed text-ink-soft">
    Your inhaler and your symptoms, in one breath — dose logging, severity tracking,
    and bloom-style analytics with a composite control score. Build by WP.
  </p>
  <BreatheHero />
</div>
```

#### Chip section — add breathe tone

In the Chip `DemoCard`, add `<Chip tone="breathe">breathe</Chip>` to the row.

---

## 7. Tool registry & routing

| File | Change |
|---|---|
| `src/tools/tools.config.ts` | Add `'breathe'` to `ToolId` union; add `'breathe'` to `ToolAccent` union; add entry: `{ id: 'breathe', name: 'Daily Breath', tagline: '...', description: '...', icon: 'inhaler', accent: 'breathe', route: '/tools/breathe', pinnedByDefault: true }` |
| `src/app/AppShell.tsx` | Add `<Route path="/tools/breathe" element={<BreatheScreen />} />` |
| `src/design/icons.tsx` | Add `'inhaler'` to `IconName` union + stroke path |
| `src/design/pixelSprites.ts` | Add `inhaler` sprite |
| `src/index.css` | Add `--color-breathe-*` tokens (light + dark) |
| `src/design/tokens.ts` | Add `breathe` to `colors`, `colorsDark`, `toolAccents` |

---

## 8. Tests & verification

| Test | File | What it covers |
|---|---|---|
| Token sync | `tests/tokens.test.ts` (existing) | breathe CSS ↔ JS tokens stay in sync (auto) |
| Parity suite | `tests/parity.suite.ts` | Med/symptom/dose CRUD, cascade delete, export includes new collections |
| Scoring unit | `src/features/breathe/scoring.test.ts` | Rolling avg min-days, normal band min points, Spearman ties, adherence calc, control thresholds, whatChanged delta |
| Demo data | `src/features/breathe/demoData.test.ts` | Seed data shape validity |
| Component | `src/features/breathe/BreatheScreen.test.tsx` | Fake repo: seed → add dose → check-in → control banner text → dataset lengths |
| E2E | `e2e/breathe.spec.ts` | Quick-add dose, symptom check-in, visualize renders, sample data add/remove, no console errors |
| RLS security | `tests/rls-security.test.ts` | New table assertions (environment-gated) |

### Verification commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:rls     # if local supabase stack
npx playwright test e2e/breathe.spec.ts
```

### CI budgets (already configured)

- Lighthouse: Perf ≥ 90, A11y ≥ 95, BP ≥ 90, SEO ≥ 90
- `e2e/console.spec.ts` catches any new console errors

---

## 9. Work packages (execution order)

| WP | Scope | Files |
|---|---|---|
| **WP0** | Dependencies + icon + sprite + tokens + accent | `npm i chart.js`, `icons.tsx`, `pixelSprites.ts`, `index.css`, `tokens.ts` |
| **WP1** | Contract: types + repository + 3 impls + Dexie + migration + parity + migrateLocal + export/delete | `types.ts`, `repository.ts`, `db.ts`, 3 repo files, SQL migration, `parity.suite.ts`, `migrateLocal.ts` |
| **WP2** | Tool wiring: registry + route + Chip/Tile support | `tools.config.ts`, `AppShell.tsx`, `Chip.tsx`, `Tile.tsx` |
| **WP3** | Scoring module + tests | `scoring.ts`, `controlStates.ts`, `constants.ts`, `scoring.test.ts` |
| **WP4** | Screen: dose logging + symptom check-in + manage | `BreatheScreen.tsx`, `BreatheScreen.test.tsx` |
| **WP5** | Chart.js wrapper + visualization sections | `Chart.tsx`, `chartData.ts`, trend/time-of-day/insight/heatmap |
| **WP6** | Demo seed + empty states + wipe | `demoData.ts`, `demoData.test.ts` |
| **WP7** | Styleguide hero + colour ramp + chip/tile | `BreatheHero.tsx`, `Styleguide.tsx` |
| **WP8** | E2E + docs | `e2e/breathe.spec.ts`, optional BUILD_PLAN update |

---

## 10. Key constraints & reminders

- **Never touch bloom's tables.** All new Supabase tables are `steady_*` prefixed with RLS owner policies.
- **snake_case never leaks.** Domain types are camelCase; row mappers convert at the repo boundary.
- **Motion never carries meaning.** Final state renders at rest. `usePrefersReducedMotion()` for chart animation.
- **Never colour alone.** Every state carries icon + label + copy. Correlation heatmap always shows numeric values.
- **44px minimum touch targets.** Severity buttons, stepper controls, dose log actions.
- **`useRepository()` only.** Never touch Dexie/Supabase directly from feature code.
- **Additive exports.** `ExportBundle` gains new arrays — existing consumers unaffected.
- **tokens.test.ts stays green.** Every CSS token added must have a JS mirror and vice versa.
- **Console.spec.ts stays green.** No console errors from Chart.js or new feature code.
