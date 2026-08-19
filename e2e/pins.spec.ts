import { expect, test, type Page } from '@playwright/test'

test.describe('pins', () => {
  test.beforeEach(async ({ page }) => {
    // Fresh storage so pin defaults apply — cleared before the app boots,
    // so each test needs only one page load.
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/')
  })

  const pinnedGrid = (page: Page) =>
    page
      .getByRole('heading', { name: 'Your tools' })
      .locator('xpath=following-sibling::div[1]')

  test('reorders pinned tools with the down button and persists', async ({ page }) => {
    const grid = pinnedGrid(page)

    // First pinned card is Energy Jar.
    const first = grid.getByRole('article').first()
    await expect(first.getByText('Energy Jar')).toBeVisible()
    await expect(first.getByRole('button', { name: 'Move Energy Jar down' })).toBeEnabled()
    await expect(first.getByRole('button', { name: 'Move Energy Jar up' })).toBeDisabled()

    await first.getByRole('button', { name: 'Move Energy Jar down' }).click()

    // Energy Jar moved below Mood & Symptom Tracker.
    await expect(grid.getByRole('article').first().getByText('Mood & Symptom Tracker')).toBeVisible()
    await expect(grid.getByRole('article').nth(1).getByText('Energy Jar')).toBeVisible()

    // Reload and confirm the reorder persisted.
    await page.reload()
    await expect(grid.getByRole('article').first().getByText('Mood & Symptom Tracker')).toBeVisible()
    await expect(grid.getByRole('article').nth(1).getByText('Energy Jar')).toBeVisible()
  })

  test('reorders pinned tools with the up button', async ({ page }) => {
    const grid = pinnedGrid(page)

    // Mood & Symptom Tracker is second, so its up button is enabled.
    const second = grid.getByRole('article').nth(1)
    await expect(second.getByText('Mood & Symptom Tracker')).toBeVisible()
    await expect(second.getByRole('button', { name: 'Move Mood & Symptom Tracker up' })).toBeEnabled()

    await second.getByRole('button', { name: 'Move Mood & Symptom Tracker up' }).click()

    await expect(grid.getByRole('article').first().getByText('Mood & Symptom Tracker')).toBeVisible()
    await expect(grid.getByRole('article').nth(1).getByText('Energy Jar')).toBeVisible()
  })
})
