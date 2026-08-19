import { expect, test } from '@playwright/test'

test.describe('timeline', () => {
  test.beforeEach(async ({ page }) => {
    // Fresh storage so no entries or zones leak between tests.
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/#/tools/timeline')
  })

  test('shows the empty state', async ({ page }) => {
    await expect(page.getByText('Nothing here yet')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add your first entry' })).toBeVisible()
  })

  test('adds an entry', async ({ page }) => {
    await page.getByRole('button', { name: 'Add entry' }).click()
    await page.getByLabel('Title').fill('First day')
    await page.getByLabel('Start date').fill('2026-01-05')
    await page.getByRole('button', { name: 'Save entry' }).click()
    await expect(page.getByRole('heading', { name: 'First day', exact: true })).toBeVisible()
    await expect(page.getByText('5 Jan 2026')).toBeVisible()
  })

  test('edits an entry', async ({ page }) => {
    await page.getByRole('button', { name: 'Add entry' }).click()
    await page.getByLabel('Title').fill('First day')
    await page.getByLabel('Start date').fill('2026-01-05')
    await page.getByRole('button', { name: 'Save entry' }).click()
    await page.getByRole('button', { name: 'Edit "First day"' }).click()
    await page.getByLabel('Title').fill('First day (edited)')
    await page.getByRole('button', { name: 'Save entry' }).click()
    await expect(page.getByRole('heading', { name: 'First day (edited)', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'First day', exact: true })).toHaveCount(0)
  })

  test('deletes an entry with confirmation', async ({ page }) => {
    await page.getByRole('button', { name: 'Add entry' }).click()
    await page.getByLabel('Title').fill('Temp')
    await page.getByLabel('Start date').fill('2026-02-01')
    await page.getByRole('button', { name: 'Save entry' }).click()
    page.on('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete "Temp"' }).click()
    await expect(page.getByRole('heading', { name: 'Temp', exact: true })).toHaveCount(0)
  })

  test('adds a zone', async ({ page }) => {
    await page.getByRole('button', { name: 'Add zone' }).click()
    await page.getByLabel('Name').fill('Semester 1')
    await page.getByLabel('Start date').fill('2026-01-01')
    await page.getByRole('button', { name: 'Save zone' }).click()
    await expect(page.getByText('Semester 1')).toBeVisible()
  })
})