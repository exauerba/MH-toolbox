import { expect, test } from '@playwright/test'

test.describe('jar', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/#/tools/jar')
  })

  test('logs a spoonful with a label', async ({ page }) => {
    // First log: the default 0.5, no label.
    await page.getByRole('button', { name: 'Log 0.5' }).click()
    await expect(page.getByRole('listitem').getByText('No label', { exact: true })).toBeVisible()
    await expect(page.getByText('0.5 spoons', { exact: true })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: /left$/ })).toContainText('11.5')

    // Second log: bump the stepper to 1.5 and add a label.
    const increase = page.getByRole('button', { name: /increase/i })
    await increase.click()
    await increase.click()
    await page.getByLabel('Label (optional)').fill('work call')
    await page.getByRole('button', { name: 'Log 1.5' }).click()
    await expect(page.getByRole('listitem').getByText('work call', { exact: true })).toBeVisible()
    await expect(page.getByText('1.5 spoons', { exact: true })).toBeVisible()
  })

  test('edits a logged spoonful', async ({ page }) => {
    await page.getByRole('button', { name: /increase/i }).click()
    await page.getByLabel('Label (optional)').fill('shower')
    await page.getByRole('button', { name: 'Log 1' }).click()
    await expect(page.getByRole('listitem').getByText('shower', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Edit "shower"' }).click()
    await page.getByLabel('Label', { exact: true }).fill('bath')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('listitem').getByText('bath', { exact: true })).toBeVisible()
    await expect(page.getByRole('listitem').getByText('shower', { exact: true })).toHaveCount(0)
  })

  test('deletes a logged spoonful', async ({ page }) => {
    await page.getByRole('button', { name: 'Log 0.5' }).click()
    await page.getByRole('button', { name: 'Delete "untitled"' }).click()
    await expect(
      page.getByText('Nothing logged yet today. The jar stays full until you spend.'),
    ).toBeVisible()
  })

  test('shows the overdrawn state when spending exceeds the jar', async ({ page }) => {
    const increase = page.getByRole('button', { name: /increase/i })
    for (let i = 0; i < 9; i += 1) {
      await increase.click()
    }
    const log = page.getByRole('button', { name: 'Log 5' })
    await log.click()
    await log.click()
    await log.click()

    await expect(page.getByText('Borrowed from tomorrow', { exact: true })).toBeVisible()
    await expect(page.getByText('borrowed', { exact: true })).toBeVisible()
  })

  test('shows the running-low state at 3 or fewer left', async ({ page }) => {
    const increase = page.getByRole('button', { name: /increase/i })
    for (let i = 0; i < 9; i += 1) {
      await increase.click()
    }
    await page.getByRole('button', { name: 'Log 5' }).click()

    const decrease = page.getByRole('button', { name: /decrease/i })
    await decrease.click()
    await decrease.click()
    await page.getByRole('button', { name: 'Log 4' }).click()

    await expect(page.getByText('Running low', { exact: true })).toBeVisible()
  })
})