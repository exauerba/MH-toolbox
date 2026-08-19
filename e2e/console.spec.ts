import { expect, test, type Page } from '@playwright/test'

test.describe('console', () => {
  test('has no console errors on any route', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    const routes: Array<{
      path: string
      // A stable, unique element to confirm the route rendered.
      locator: ReturnType<Page['getByRole']> | ReturnType<Page['getByText']>
    }> = [
      { path: '/', locator: page.getByRole('heading', { name: 'A toolbox you can hold onto.' }) },
      { path: '/#/tools/jar', locator: page.getByRole('heading', { name: 'Energy Jar' }) },
      { path: '/#/tools/timeline', locator: page.getByRole('heading', { name: 'Personal Timeline' }) },
      { path: '/#/settings', locator: page.getByRole('heading', { name: 'Settings' }) },
      { path: '/#/about', locator: page.getByRole('heading', { name: 'About steady' }) },
      // The styleguide surfaces its title as a paragraph, not a heading.
      { path: '/#/styleguide', locator: page.getByText(/design styleguide/) },
    ]

    for (const { path, locator } of routes) {
      await page.goto(path)
      await expect(locator).toBeVisible()
    }

    expect(errors).toEqual([])
  })
})
