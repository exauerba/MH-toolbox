import { expect, test } from '@playwright/test'

test.describe('settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/#/settings')
  })

  test('toggles the theme', async ({ page }) => {
    const dark = page.locator('html.dark')
    await expect(dark).toHaveCount(0)
    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect(dark).toHaveCount(1)
    await page.getByRole('button', { name: 'Switch to light mode' }).click()
    await expect(dark).toHaveCount(0)
  })

  test('shows export and delete controls', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Export JSON' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete data' })).toBeVisible()
  })

  test('delete data requires confirmation', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete data' }).click()
    await expect(page.getByRole('heading', { name: 'Delete all data?' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete everything' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('heading', { name: 'Delete all data?' })).toBeHidden()
  })
})