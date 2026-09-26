import { expect, test, type Page } from '@playwright/test'

const tab = (page: Page, name: string) =>
  page.getByRole('radiogroup', { name: 'Sections' }).getByText(name, { exact: false }).click()

async function seedStarter(page: Page) {
  await page.getByRole('button', { name: /Start with a warm starter scale/ }).click()
  await expect(page.getByRole('heading', { name: 'Your levels' })).toBeVisible()
}

// The signed-in partner-link flow needs real Supabase credentials, so it is
// covered by unit tests (ShareTab.test.tsx). These specs verify the guest
// experience and the public /share/:token route degrade gracefully.
test.describe('lantern share', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/#/tools/lantern')
  })

  test('guest mode explains that partner links need an account', async ({ page }) => {
    await seedStarter(page)

    await tab(page, 'Share')

    await expect(page.getByText('Partner links need an account')).toBeVisible()
  })

  test('an unknown share token renders a friendly state', async ({ page }) => {
    await page.goto('/#/share/00000000-0000-0000-0000-000000000000')

    // Without Supabase env vars the client is null; either way the page must
    // never crash and must show a calm, readable message. When env vars ARE
    // present the RPC round-trips to the real project (which 404s until
    // migration 009 is applied), so allow generous time for that.
    await expect(
      page.getByText(/This lantern isn't lit|This link could not be opened|Sharing is not available/),
    ).toBeVisible({ timeout: 15000 })
  })
})