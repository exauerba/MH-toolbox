import { expect, test, type Page } from '@playwright/test'

const tab = (page: Page, name: string) =>
  page.getByRole('radiogroup', { name: 'Sections' }).getByText(name, { exact: false }).click()

test.describe('breathe', () => {
  test.beforeEach(async ({ page }) => {
    // Fresh storage so the breathe tool starts empty.
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/#/tools/breathe')
  })

  test('logs a dose with a time', async ({ page }) => {
    // Add a medication first so there is something to log.
    await tab(page, 'Medications')
    await page.getByPlaceholder('e.g. Ventolin, Fluticasone').fill('Ventolin')
    await page.getByRole('combobox').selectOption('reliever')
    await page.getByRole('button', { name: 'Add Medication' }).click()
    await expect(page.getByText('Ventolin', { exact: true })).toBeVisible()

    await tab(page, 'Log Dose')
    await page.getByRole('combobox').selectOption({ label: 'Ventolin' })
    await page.getByLabel('Time').fill('14:30')
    await page.getByRole('button', { name: 'Log Dose' }).click()

    await expect(page.getByText('14:30', { exact: true })).toBeVisible()
    await expect(page.getByText('No dose logs yet today', { exact: false })).toHaveCount(0)
  })

  test('saves a symptom check-in', async ({ page }) => {
    await tab(page, 'Check-in')
    await page.getByLabel('Peak Flow').fill('480')
    await page.getByLabel('Journal Note').fill('tight chest in the morning')
    await page.getByRole('button', { name: 'Save Ritual' }).click()

    await expect(page.getByText('Peak Flow: 480 L/min')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Recent Check-ins' })).toBeVisible()
  })

  test('renders the visualize section from a sample fortnight', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await tab(page, 'Check-in')
    await page.getByRole('button', { name: /Try a sample fortnight/i }).click()
    // The seed writes 14 check-ins, 2 medications and dose logs; the empty
    // state disappears once the reload settles.
    await expect(page.getByRole('button', { name: /Try a sample fortnight/i })).toHaveCount(0)

    await tab(page, 'Visualize')

    await expect(page.getByRole('heading', { name: 'Asthma control' })).toBeVisible()
    await expect(page.getByText('/ 100')).toBeVisible()
    await expect(
      page.getByRole('img', { name: /Line chart of symptom severity and peak flow/ }),
    ).toBeVisible()
    await expect(page.getByRole('img', { name: /Bar chart of dose logs/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'What helped?' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remove sample data' })).toBeVisible()

    expect(errors).toEqual([])
  })

  test('removes sample data and returns to empty states', async ({ page }) => {
    await tab(page, 'Check-in')
    await page.getByRole('button', { name: /Try a sample fortnight/i }).click()
    await expect(page.getByRole('button', { name: /Try a sample fortnight/i })).toHaveCount(0)

    await tab(page, 'Visualize')
    await page.getByRole('button', { name: 'Remove sample data' }).click()

    await expect(page.getByText(/Add a few check-ins to see your symptom trend/i)).toBeVisible()

    await tab(page, 'Log Dose')
    await expect(page.getByRole('combobox')).toContainText('No medications available')
  })
})