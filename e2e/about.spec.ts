import { expect, test } from '@playwright/test'

test.describe('about', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/#/about')
  })

  test('shows the crisis resources', async ({ page }) => {
    await expect(page.getByRole('heading', { name: "If you're in crisis right now" })).toBeVisible()
    await expect(page.getByRole('link', { name: '988 Suicide & Crisis Lifeline' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Crisis Text Line' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Emergency services' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'International Association for Suicide Prevention' })).toBeVisible()
  })

  test('crisis links have correct hrefs', async ({ page }) => {
    await expect(page.getByRole('link', { name: '988 Suicide & Crisis Lifeline' })).toHaveAttribute('href', 'tel:988')
    await expect(page.getByRole('link', { name: 'Crisis Text Line' })).toHaveAttribute('href', 'sms:741741')
    await expect(page.getByRole('link', { name: 'Emergency services' })).toHaveAttribute('href', 'tel:911')
  })
})