import { expect, test } from '@playwright/test'

test('home page loads and shows the steady hub', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'A toolbox you can hold onto.' }),
  ).toBeVisible()
  await expect(page.getByText('Energy Jar')).toBeVisible()
  await expect(page.getByText('Mood & Symptom Tracker')).toBeVisible()
})
