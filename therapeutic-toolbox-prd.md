# Product Requirements Document: Therapeutic Toolbox PWA

**Status:** Draft v1
**Author:** [Esther D. Auerbach & associated AI agents]
**Last updated:** August 15, 2026

---

## 1. Overview

A hub Progressive Web App that centralizes a set of self-guided emotional-regulation and processing tools. Users land on a home screen (the "toolbox"), and from there can open, use, and — critically — **pin individual tools to their device home screen** so each tool feels like its own lightweight app. The hub links out to an existing, already-built mood/symptom tracker PWA, and ships with two new tools at launch: an **Energy Jar (Spoon Theory tracker)** and a **Personal Timeline builder**. The toolbox is intended both for personal use and as a free public resource for others (potentially including the user's therapist recommending it to clients).

## 2. Goals

- Give users one calm, low-friction place to find and use regulation/processing tools, instead of scattering standalone apps.
- Preserve the "one tool, one purpose" feel — each tool should still feel like its own small app when pinned, not buried in a mega-app.
- Make the existing mood/symptom tracker feel like a native part of the toolbox even though it remains a separate app under the hood.
- Ship an Energy Jar (spoons) tool that's visual, fast to log, and genuinely reduces the friction of energy accounting during a low-spoon day.
- Ship a Personal Timeline tool that supports multimedia (text, color, images) and "zone" highlighting (e.g., nervous-system states or life-period framing) for narrative/processing work.
- Support both signed-in (Supabase) and local-only guest use, so people can try it with zero commitment.
- Be usable by someone in a dysregulated state: low cognitive load, large touch targets, no dead ends, nothing that feels clinical/cold.
- **Visual appeal is a core requirement, not polish layered on at the end.** The app should feel warm, considered, and pleasant to look at and use — this matters especially given the audience and subject matter, where a cold/clinical/utilitarian interface actively works against the app's purpose.

## 3. Non-goals (for v1)

- Not a replacement for therapy or crisis support; no clinical decision-making or diagnosis.
- Not building a therapist-facing dashboard/portal in v1 (may be a later phase if shared with clients).
- Not attempting true "install this one sub-tool as its own separate home-screen icon with its own app identity" if that turns out to require separate deployments per tool (see §7 open technical question) — v1 will use the best available approximation.
- Not migrating/rebuilding the existing tracker's codebase — it stays as-is and is only linked to.

## 4. Users & context of use

- **Primary:** you, for personal regulation/processing.
- **Secondary:** the general public / people referred by a therapist — likely first-time users with no account, possibly in an activated or low-energy state when they arrive.
- Usage happens in short bursts throughout the day (checking in, logging spoons) and in longer sessions (building a timeline).
- Because this may hold sensitive mental-health-adjacent data for third parties, privacy and clear data ownership need to be first-class from v1, not bolted on later.

## 5. Information architecture

**Hub (home screen of the PWA)**
- Grid/list of tool cards: Mood & Symptom Tracker (external link), Energy Jar, Personal Timeline, [future tools].
- Each card: icon, one-line description, "Open" and "Pin to home screen" actions.
- Light global nav: Home, Settings/Account, About/Resources (crisis resources, disclaimers).

**Per-tool**
- Each tool opens as its own screen/route with its own visual identity (distinct accent color or icon) so it doesn't feel like "one gray app."
- Consistent back-to-hub affordance.

## 6. Feature specifications

### 6.1 Hub / shell
- Installable PWA (manifest, service worker, offline shell).
- Tool directory is data-driven (a config list of tools with metadata), so adding a future tool doesn't require restructuring navigation.
- "Pin to home screen" per tool — this means pinning *within the hub's own home screen* (favoriting a tool so it surfaces at the top), not an OS-level home screen icon. See §7 for the design approach.
- Guest mode banner/indicator when not signed in ("Using locally on this device — sign in to back this up").
- Settings: account/sign-in, data export, data deletion, theme.

### 6.2 Mood/Symptom Tracker (existing app) integration
- Goal: "smoothest, least jarring" hand-off possible.
- Approach: hub card opens the tracker in the same webview/tab (not a visibly separate browser context) where feasible, with matching visual theme (shared color tokens/logo treatment) so the transition doesn't feel like leaving the product.
- If the two apps can share the same Supabase project/auth session, sign-in should carry over automatically (no second login).
- Data question to resolve during build: does the tracker's schema live in the same Supabase project as the hub, or a separate one? This determines whether cross-app auth/session sharing is automatic or needs a token hand-off.
- The hub can optionally surface a small summary/teaser from the tracker (e.g., "last check-in: 2 days ago") if its data is reachable — nice-to-have, not required for v1.

### 6.3 Energy Jar (Spoon Theory tracker)
**Core concept:** a visual jar of chips/spoons representing a daily energy allowance. User logs spoons spent (and optionally what they were spent on); jar visually adjusts.

- **Setup:** user sets (or accepts a default) total spoons for the day — e.g., 12. Editable per day, since capacity varies.
- **Logging:** quick-add flow — tap to log "spent N spoons," optional free-text or tag for "on what" (e.g., "shower," "work call," "social event"). Should take under ~10 seconds for a bare-minimum log.
- **Visualization:** jar fills/empties (or chips visibly move from "available" to "spent" pile) in real time as spoons are logged. Should read clearly at a glance — no math required.
- **States:** healthy remaining, running low (visual warning, non-alarming — e.g., color shift, not a jarring alert), overdrawn (spent more than the day's allotment — supportive framing, not punitive).
- **History:** simple day-by-day view of totals and what spoons went to, so patterns become visible over time (e.g., "social events cost the most").
- **Editing:** ability to correct/delete a log entry.
- **Reset:** new jar each day (configurable start time, since some people's "day" doesn't start at midnight).

Open questions to settle before build: does remaining/spent need to sync with the mood tracker (e.g., low spoons correlating with mood dips), or is it fully standalone in v1? Standalone is the safer v1 scope.

### 6.4 Personal Timeline
**Core concept:** a personal timeline for narrative/processing work — entries with color, images, words, and "zone" highlighting.

- **Entries:** each timeline entry has a date/period, title, free-text description, optional image(s), and an assigned color.
- **Zones:** highlighted bands/ranges across the timeline representing a state or period (e.g., nervous-system zones like regulated/hyperaroused/hypoaroused, or user-defined life chapters). User can define their own zone labels and colors, not just a fixed clinical set — flexibility matters since "zones" could mean different frameworks to different users.
- **Views:** a horizontal/vertical scrollable timeline; entries plotted along it; zones shown as background bands or a separate lane.
- **Editing:** add/edit/delete/reorder entries; adjust zone ranges.
- **Privacy:** timelines can contain very sensitive personal history — needs to be covered by the same data-ownership/export/delete guarantees as everything else, and ideally not shown in any shared/therapist view without explicit action from the user (no default sharing).
- **Media:** images stored where? (device-local for guests; Supabase storage for signed-in users) — needs a defined upload size/format limit.

### 6.5 Advanced Statistics
**Core concept:** a section where the user can run real statistical tests on their own tracked data (mood/symptom entries, spoon logs, timeline data), by choice — not just pre-baked charts, but actual analysis they configure.

- **Data source selection:** user picks which dataset(s) to analyze (e.g., mood scores, spoon totals, a specific symptom) and a date range/filter.
- **Test selection:** user picks from a menu of tests appropriate to their data — e.g., descriptive stats (mean/median/SD/trend), correlation between two tracked variables (e.g., spoons spent vs. next-day mood), simple trend/regression over time, comparison between two periods or conditions (e.g., t-test style comparison of before/after a change). Exact test menu should be scoped with an eye to what's statistically valid for typically small, irregularly-sampled personal tracking data — avoid presenting a test as reliable when the underlying data doesn't support it (e.g., flag low sample size).
- **Output:** plain-language summary of the result alongside the underlying numbers/chart (e.g., "there's a moderate positive relationship between spoons spent and next-day fatigue, based on 34 days of data") — not just a raw statistic, since the audience won't all be reading p-values comfortably.
- **Guardrails:** framed clearly as personal exploratory analysis, not a clinical or diagnostic tool; appropriate caveats about correlation vs. causation and small-sample limitations should accompany results.
- **Access to underlying data:** this feature depends on the Tracker's data being reachable by the hub (see the Supabase project-boundary question below) — if the Tracker's data can't be queried from the new app, this feature would be limited to Energy Jar/Timeline data only, which is a meaningfully smaller version of the feature.

## 7. Key technical/architecture questions to resolve before build

1. **In-app pinning design.** "Pin to home screen" refers to the hub's own landing screen, not OS-level installation — a favoriting mechanism so frequently-used tools surface at the top instead of requiring a scroll through the full directory. Design approach:
   - Hub home screen has a **Pinned** section up top and a **full directory** below (or a toggle between views).
   - Each tool card has a pin/unpin control (star icon, long-press, or an explicit "Customize" edit mode).
   - Pin state is a small ordered list of tool IDs, stored per-user (Supabase for signed-in users, local storage for guests) — same storage-mode pattern as the rest of the app's data.
   - New-user default: either an empty pinned section, or a couple of core tools (e.g., Tracker + Energy Jar) pre-pinned so the home screen isn't blank on first launch.
   - Drag-to-reorder pinned tools is a reasonable v1.1 addition rather than MVP-required.
   - The Mood/Symptom Tracker card behaves like any other tile here — pinnable or not, unaffected by the link-out mechanics in §6.2.
   Since this only needs one shared PWA (no per-tool manifests/service workers), it also simplifies the rest of the architecture — one installable shell for the whole hub is sufficient.

2. **Supabase project boundary:** one shared Supabase project across hub + Energy Jar + Timeline + (if possible) the existing Tracker, versus separate projects per app. Shared project = seamless single sign-on and easier future cross-tool insights; separate = less risk of coupling but a second login for the Tracker.

3. **Guest → account upgrade path:** when a local guest user later signs in, do we offer to migrate their local data into their new account? Recommend yes — a one-time "import local data" step on first sign-in, since losing a day's spoon log or a timeline someone just built would be a bad first impression.

## 8. Data & privacy

- Two storage modes: **Guest (local-only)** via IndexedDB, no account required, data never leaves device; **Signed-in (Supabase)** with cloud sync/backup across devices.
- Clear, plain-language explanation at first launch of what "guest" vs "signed in" means for their data — this matters more than usual given the content (mental health logs, personal history/timeline).
- Data export (at minimum: JSON/CSV of jar history and timeline entries) and full account/data deletion available from Settings.
- No default sharing of any tool's data with anyone (including a therapist) — sharing, if ever added, should be an explicit opt-in action.
- Since this will be offered publicly, plan for basic abuse/misuse safeguards (e.g., Supabase storage limits per user) and a lightweight crisis-resources link in Settings/About, given the audience.

## 9. Non-functional requirements

- Installable PWA, offline-capable app shell at minimum (tools that require Supabase sync can gracefully degrade offline).
- Fast, low-cognitive-load UI: large touch targets, minimal steps to log something, no autoplay/sound surprises.
- **Visual design as a first-class requirement:** a deliberate, cohesive design system (color palette, typography, iconography, motion) applied consistently across the hub and every tool — including the Energy Jar's jar/chip visuals, the Timeline's color/zone rendering, and charts in Advanced Statistics. These are the moments where visual craft matters most, since they're the parts users will look at repeatedly and where dry/utilitarian defaults would undercut the app's purpose most.
- Accessible: sufficient color contrast (careful with the jar/zone color-coding, and any statistics charts — must not rely on color alone), screen-reader labels, reduced-motion option for animations (jar fill, etc.).
- Visual/brand consistency between the hub and the Tracker hand-off so it doesn't feel like leaving the product.

## 10. Suggested phased roadmap

**Phase 1 (MVP):**
- Hub shell with installable PWA, tool directory, Supabase auth + guest mode.
- In-app pinning (§7.1) — this is core UX, not a later add-on, so it belongs in MVP.
- Energy Jar: full logging + visualization + daily history.
- Link-out to existing Tracker with matched theming and, if feasible, shared auth session.
- Settings: export, delete account/data.

**Phase 2:**
- Personal Timeline (entries, images, zones, editing).
- Guest → account data migration flow.
- Drag-to-reorder for pinned tools.

**Phase 3:**
- Advanced Statistics (data source/test selection, plain-language output, guardrails) — sequenced after Phase 1/2 since it depends on the Supabase project-boundary decision and benefits from having Jar/Timeline data already flowing.

**Phase 4 (stretch):**
- Cross-tool insight surfacing beyond what Advanced Statistics already covers.
- Additional tools added to the directory.
- Optional therapist/client sharing view (explicit opt-in only).

## 11. Success signals

- Time-to-first-log on Energy Jar (should be very low — this is the "did the friction problem get solved" metric).
- Return usage of the jar across multiple days (habit formation for energy accounting).
- Number of timeline entries created and returned-to (signal that it's being used for real processing, not a one-off).
- Guest-to-signed-in conversion rate (signal the account/backup value prop lands).
- If shared publicly: adoption beyond you (installs, active users) as a loose signal it's useful as a resource.