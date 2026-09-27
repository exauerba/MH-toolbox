import { expect, test } from '@playwright/test'

test('styleguide route renders the design system', async ({ page }) => {
  await page.goto('/#/styleguide')
  await expect(page.getByText('steady — design styleguide')).toBeVisible()
  await expect(page.getByText(/a toolbox you can hold onto/i)).toBeVisible()
  await expect(page.getByText('The Energy Jar', { exact: true })).toBeVisible()
  await expect(page.getByText('The Timeline zones', { exact: true })).toBeVisible()
  await expect(page.getByText('The hub tool cards', { exact: true })).toBeVisible()
  // One spec panel per hero visual in Styleguide.tsx: Jar, Timeline, Hub,
  // Breathe, Lantern. The Lantern hero (5641672) made this five; the count was
  // still four.
  await expect(page.getByRole('heading', { name: 'Implementation spec', exact: true })).toHaveCount(5)
})

test('styleguide has no console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto('/#/styleguide')
  await expect(page.getByText('steady — design styleguide')).toBeVisible()
  expect(errors).toEqual([])
})
