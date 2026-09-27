import { expect, test, type Page } from '@playwright/test'

/**
 * Partners tab — the guest journey only.
 *
 * Everything that makes Partners a *partners* feature needs two real accounts.
 * An invite is sent by one user to another, the invitee has to accept before
 * the pair is active, and the read-only pane is only ever assembled by the
 * `get_partner_status()` RPC — which is granted to `authenticated` (never
 * `anon`), takes no arguments, and derives the caller from its own JWT. None of
 * that is reachable from a credential-free run, so it is covered where it can
 * be: the Vitest component tests (PartnersTab, PartnerPane, SetLevelSheet) and
 * the Supabase parity suite, which drives the same flows through the real
 * repository against the real RPC.
 *
 * What is left — and all this file covers — is the half a user can reach with
 * no account at all: naming where you are on a 60-minute window, refreshing or
 * clearing that, and being told plainly that seeing anyone else's lantern
 * needs an account.
 */

const tab = (page: Page, name: string) =>
  page.getByRole('radiogroup', { name: 'Sections' }).getByText(name, { exact: false }).click()

/** Level 2 of the seeded starter scale (src/features/lantern/starterScale.ts). */
const LEVEL_TWO = 'Settled'

/**
 * The card renders the label and its position as one element ("Settled2"), so
 * the line is matched from its start rather than as an exact whole string.
 */
const levelLine = (page: Page) => page.getByText(new RegExp(`^${LEVEL_TWO}`))

/** The live countdown beside a set level: "40 min left" or "1h left". */
const countdown = (page: Page) => page.getByText(/· (\d+ min|\d+h) left/)

async function seedStarter(page: Page) {
  await page.getByRole('button', { name: /Start with a warm starter scale/ }).click()
  await expect(page.getByRole('heading', { name: 'Your levels' })).toBeVisible()
}

/** Seed, then land on Partners — the starting point of every test here. */
async function openPartners(page: Page) {
  await seedStarter(page)
  // The tab inputs are sr-only radios, so the LABEL is the click target.
  await tab(page, 'Partners')
  await expect(page.getByRole('heading', { name: 'Your current level' })).toBeVisible()
}

/** Pick level 2 by its words, not its number, and confirm — as a user would. */
async function setLevelTwo(page: Page) {
  await page.getByRole('button', { name: 'Set my level' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: new RegExp(LEVEL_TWO) }).click()
  await page.getByRole('button', { name: 'Set this level' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test.describe('lantern partners (guest)', () => {
  test.beforeEach(async ({ page }) => {
    // Fresh storage so the lantern starts empty and nobody is signed in.
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/#/tools/lantern')
  })

  test('a guest can set a current level', async ({ page }) => {
    await openPartners(page)

    await expect(page.getByRole('button', { name: 'Set my level' })).toBeVisible()

    await setLevelTwo(page)

    await expect(levelLine(page)).toBeVisible()
    // The window is live, so the card offers a refresh rather than a fresh set.
    await expect(page.getByRole('button', { name: 'Still true?' })).toBeVisible()
    await expect(countdown(page)).toBeVisible()
  })

  test('"Still true?" refreshes the level', async ({ page }) => {
    await openPartners(page)
    await setLevelTwo(page)

    await page.getByRole('button', { name: 'Still true?' }).click()

    // Same level, window restarted rather than topped up.
    await expect(levelLine(page)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Still true?' })).toBeVisible()
    await expect(countdown(page)).toBeVisible()
  })

  test('"Clear my level" empties the card', async ({ page }) => {
    await openPartners(page)
    await setLevelTwo(page)
    // Shown first, so the "gone" assertion below means cleared, never rendered.
    await expect(levelLine(page)).toBeVisible()

    await page.getByRole('button', { name: 'Change' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Clear my level' }).click()

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Set my level' })).toBeVisible()
    await expect(levelLine(page)).toHaveCount(0)
  })

  test('partner lists are account-gated in guest mode', async ({ page }) => {
    await openPartners(page)

    // The incoming half asks for an account rather than showing a form.
    await expect(page.getByText(/needs an account/)).toBeVisible()
    await expect(page.getByText(/so you can connect back/)).toBeVisible()

    // The outgoing half is signed-in only, so nothing of it leaks: no heading,
    // no username field, no add button.
    await expect(page.getByRole('heading', { name: 'People who can see your level' })).toHaveCount(0)
    await expect(page.getByLabel('Their username')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Add person' })).toHaveCount(0)
  })

  test('the level list is label-first', async ({ page }) => {
    await openPartners(page)

    await page.getByRole('button', { name: 'Set my level' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Naming the feeling is the point, so the label has to come before the
    // number. The dialog is read as one string; the seeded scale's first
    // numeral is level 2's, so a "2" that is present at all is that one.
    const text = (await dialog.textContent()) ?? ''
    const labelAt = text.indexOf(LEVEL_TWO)
    const positionAt = text.indexOf('2')
    expect(labelAt, 'the level label is in the dialog').toBeGreaterThanOrEqual(0)
    expect(positionAt, 'the level position is in the dialog').toBeGreaterThanOrEqual(0)
    expect(labelAt, 'the label is read before the position').toBeLessThan(positionAt)
  })
})
