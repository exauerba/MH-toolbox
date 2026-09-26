import { expect, test, type Page } from '@playwright/test'

const tab = (page: Page, name: string) =>
  page.getByRole('radiogroup', { name: 'Sections' }).getByText(name, { exact: false }).click()

async function seedStarter(page: Page) {
  await page.getByRole('button', { name: /Start with a warm starter scale/ }).click()
  await expect(page.getByRole('heading', { name: 'Your levels' })).toBeVisible()
}

test.describe('lantern', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

  test.beforeEach(async ({ page }) => {
    // Fresh storage so the lantern starts empty.
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/#/tools/lantern')
  })

  test('seeds the starter scale from the empty state', async ({ page }) => {
    await expect(page.getByText('Light your lantern')).toBeVisible()

    await seedStarter(page)

    await expect(page.getByText('Grounded', { exact: true })).toBeVisible()
    await expect(page.getByText('10 of 10')).toBeVisible()
  })

  test('edits a level label', async ({ page }) => {
    await seedStarter(page)

    await page.getByRole('button', { name: 'Edit level 1', exact: true }).click()
    await page.getByPlaceholder('e.g. Overwhelmed').fill('Chill')
    await page.getByRole('button', { name: 'Save level' }).click()

    await expect(page.getByText('Chill', { exact: true })).toBeVisible()
  })

  test('presents a level in hand-over mode', async ({ page }) => {
    await seedStarter(page)

    await tab(page, 'Show')
    await page.getByRole('button', { name: 'Start presenting' }).click()

    // Locate phase: pick level 1 (buttons are named "1 Grounded", "2 Settled", …).
    await page.getByRole('button', { name: '1 Grounded', exact: true }).click()

    // Present phase: one level at a time.
    await expect(page.getByLabel('Level 1 of 10')).toBeVisible()
    await expect(page.getByText('Grounded', { exact: true })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('copies the scale as text', async ({ page }) => {
    await seedStarter(page)

    await tab(page, 'Share')
    await page.getByRole('button', { name: 'Copy as text' }).click()

    await expect(page.getByText('Copied!')).toBeVisible()
  })
})