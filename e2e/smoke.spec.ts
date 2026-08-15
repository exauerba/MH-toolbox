import { expect, test } from '@playwright/test'

test('home page loads and shows the steady placeholder', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('steady — coming together')).toBeVisible()
})
