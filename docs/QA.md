# steady — Manual QA Checklist (G4 smoke test)

This is the manual smoke test for the **G4 gate**. It's written for a person
who knows steady (a researcher), not a QA engineer — there's no tooling, no
scripts, just things to try and tick off. Run it in a real browser against the
deployed app or a local `npm run dev` / `npm run preview`.

Two quick notes before you start:

- **Guest mode** = don't sign in. Data lives in your browser (IndexedDB).
- **Signed-in mode** = create a throwaway account (any username + password)
  and sign in. Data syncs to Supabase.

Tick each box as you go. Anything that fails, doesn't feel right, or makes you
pause — write it in the notes at the end. Feel free to test in whatever order
feels natural; the boxes are grouped so you can check off a full pass.

---

## 0. Both modes — the basics

- [ ] App loads at the hub with the steady wordmark and "A toolbox you can hold onto." — warm, quiet, not clinical.
- [ ] In guest mode, a banner tells me data is stored locally on this device.
- [ ] After I sign in, the banner is gone and I'm told I'm signed in.
- [ ] After I sign out, I'm back in guest mode and my pre-existing local data is still there.
- [ ] No browser console errors while clicking through the app.

## 1. Emotional paths (the human stuff)

> These are the paths automated tests can't fully judge. Go slow and honest.

### A dysregulated user
- [ ] Every screen has one clear, calm place to look first — nothing is loud, flashing, or urgent.
- [ ] Language is warm and never shames me ("That's information, not failure" — not "You failed").
- [ ] Large, forgiving tap targets; I never have to aim carefully.
- [ ] Colour is never the only signal — states carry an icon and text too (I'd still understand it in greyscale).

### A low-energy user
- [ ] Logging a spoonful in the Energy Jar takes well under 10 seconds (stepper → Log → done).
- [ ] Adding a timeline entry is a short, obvious flow (Add entry → title → date → Save).
- [ ] Nothing asks me to remember a lot or make hard decisions.

### Accidental taps
- [ ] Tapping a destructive action (delete data, delete entry, delete account) always asks me to confirm in a dialog first.
- [ ] I can back out of any confirm dialog without losing anything.
- [ ] A stray tap on "Unpin" doesn't destroy anything — I can re-pin with one tap.

### Interrupted sessions
- [ ] If I start typing a jar label or a timeline entry and the page reloads mid-way, the app comes back without a broken state (worst case: I just redo it — no crash, no half-saved corruption).
- [ ] Closing and reopening the app mid-log doesn't leave a phantom entry.

### Crisis resources
- [ ] On the About screen, a crisis section is easy to find, not hidden.
- [ ] It lists real helplines (default: US 988 Suicide & Crisis Lifeline) with phone numbers.
- [ ] Switching the region (US / Canada / UK / Australia / Israel) updates the list to that region's resources.

## 2. Hub

- [ ] Energy Jar and bloom appear pre-pinned at the top ("Your tools").
- [ ] Personal Timeline is in the directory below.
- [ ] Tapping the star on a tool pins it (or unpins it) and the card moves between sections.
- [ ] I can reorder pinned tools — via drag, and via the up/down arrows.
- [ ] My pin order survives a reload.
- [ ] "Open" on a tool opens that tool's screen (jar, timeline).
- [ ] "Open" on **bloom** hands off to the bloom mood tracker **in the same tab** (back button returns to steady).

## 3. Energy Jar

### Logging
- [ ] I can log a spoonful in 0.5 steps (e.g. 0.5, 1, 2.5).
- [ ] I can add an optional label (≤ 40 chars) and it shows in the log.
- [ ] The jar fills/drains and the "left / spent" numbers update as I log.

### Edit / delete
- [ ] I can edit a logged spoonful (amount and label) and it saves.
- [ ] I can delete a logged spoonful and it's removed.

### States
- [ ] With plenty left the state reads **healthy** ("Plenty left").
- [ ] Spending down to ~3 or fewer left shows a **low** state — gentle, not an alarm.
- [ ] Spending past today's total shows an **overdrawn** state with supportive copy, not a failure message.

### Reset hour
- [ ] The jar notes when it resets ("Reset at midnight" by default) and the day's spoons start fresh.

### History + patterns
- [ ] "Last 7 days" shows the last week at a glance.
- [ ] "Where your spoons went" shows totals by label (e.g. "social events cost the most").
- [ ] History and patterns reflect the entries I actually logged.

## 4. Personal Timeline

- [ ] Empty state shows when there are no entries/zones, with an "Add your first entry" action.
- [ ] I can add an entry (title + date required; end date, description, colour optional).
- [ ] I can add a zone (named, coloured date-range band) and entries fall into it.
- [ ] I can add photos to an entry (jpeg/png/webp, up to 5 per entry) and they show inline.
- [ ] I can edit an entry or zone and the change sticks.
- [ ] I can delete an entry (confirm dialog) and it and its photos are removed.
- [ ] I can switch between vertical and horizontal timeline orientation and it persists.
- [ ] Entries and zones survive a reload.

## 5. Settings

- [ ] **Theme** — I can switch light / dark and the whole app changes, calmly.
- [ ] **Sign in / up** — I can create an account, sign out, and sign back in.
- [ ] **Export** — I can download a **JSON** backup and a **CSV** of my jar logs.
- [ ] **Delete data** — I can wipe steady's data (with a confirm dialog); signed-in users get signed out after, their account stays.
- [ ] **Delete account** — signed-in only; a confirm dialog; permanently deletes the account and backed-up data.

## 6. About

- [ ] Explains what steady is and isn't (a tool, not a clinician).
- [ ] Plain-language privacy note ("stays on this device until you sign in").
- [ ] Crisis resources present with the region switcher (see §1).

## 7. Offline (PWA)

- [ ] With my connection off, the app shell still loads (it's a PWA — try reloading while offline).
- [ ] A clear offline message appears rather than a broken page.
- [ ] Reconnecting brings the app back to normal without a full restart.

---

## Notes

Use this space for anything that failed, felt off, or deserves a look:

- **Overall impression** (did it feel warm, quiet, and never clinical?):

- **Worst bug / biggest snag**:

- **Wishes / things that surprised you**:

- **Anything a researcher should know** (did a dysregulated or low-energy person seem well served?):

---

## Sign-off

- [ ] I ran a full pass in **guest mode** (local).
- [ ] I ran a full pass in **signed-in mode** (Supabase).
- [ ] I checked the offline shell.
- [ ] **Result:** Pass / Pass with notes / Fail (circle one)

Date: ____________  Signed: ____________
