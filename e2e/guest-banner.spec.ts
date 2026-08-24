import { expect, test } from '@playwright/test'

test.describe('guest banner', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await page.goto('/#/')
  })

  test('navigates to settings and disappears', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    const banner = page.getByRole('button', { name: /sign in to back this up/i })
    await expect(banner).toBeVisible()

    await banner.click()

    await expect(page).toHaveURL(/#\/settings/)
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(banner).not.toBeVisible()

    expect(errors).toEqual([])
  })

  test('can be dismissed', async ({ page }) => {
    const banner = page.getByRole('button', { name: /sign in to back this up/i })
    await expect(banner).toBeVisible()

    await page.getByRole('button', { name: 'Dismiss this message' }).click()

    await expect(banner).not.toBeVisible()
  })
})