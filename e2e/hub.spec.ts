import { expect, test } from '@playwright/test'

test.describe('hub', () => {
  test.beforeEach(async ({ page }) => {
    // Fresh storage so pin defaults apply.
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('pre-pins the Energy Jar and bloom for new users', async ({ page }) => {
    const yourTools = page.getByRole('heading', { name: 'Your tools' })
    const allTools = page.getByRole('heading', { name: 'All tools' })

    // Pinned section holds jar + bloom.
    await expect(yourTools.locator('xpath=following-sibling::div[1]').getByText('Energy Jar')).toBeVisible()
    await expect(yourTools.locator('xpath=following-sibling::div[1]').getByText('Mood & Symptom Tracker')).toBeVisible()
    // Timeline lives in the directory.
    await expect(allTools.locator('xpath=following-sibling::div[1]').getByText('Personal Timeline')).toBeVisible()
  })

  test('starring a tool moves it to Your tools and persists', async ({ page }) => {
    await page.getByRole('button', { name: 'Pin Personal Timeline to home' }).click()
    await page.reload()

    const yourTools = page.getByRole('heading', { name: 'Your tools' })
    await expect(yourTools.locator('xpath=following-sibling::div[1]').getByText('Personal Timeline')).toBeVisible()
    // And the directory no longer lists it.
    await expect(page.getByRole('button', { name: 'Unpin Personal Timeline from home' })).toBeVisible()
  })

  test('theme toggle switches the app to dark mode', async ({ page }) => {
    const dark = page.locator('html.dark')
    await expect(dark).toHaveCount(0)
    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect(dark).toHaveCount(1)
    await page.getByRole('button', { name: 'Switch to light mode' }).click()
    await expect(dark).toHaveCount(0)
  })

  test('opens the Energy Jar tool space from the hub', async ({ page }) => {
    // The Open button inside the pinned Energy Jar card.
    const jarCard = page
      .getByRole('heading', { name: 'Your tools' })
      .locator('xpath=following-sibling::div[1]')
      .getByRole('article')
      .filter({ hasText: 'Energy Jar' })
    await jarCard.getByRole('button', { name: 'Open' }).click()

    await expect(page).toHaveURL(/#\/tools\/jar/)
    await expect(page.getByRole('heading', { name: 'Energy Jar' })).toBeVisible()
    // The literal jar vessel is present.
    await expect(page.getByText('left', { exact: true })).toBeVisible()
  })
})
