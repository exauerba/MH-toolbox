import { expect, test } from '@playwright/test'

test.describe('offline', () => {
  test('loads the app shell offline', async ({ page }) => {
    // Load once so the service worker registers and precaches the shell.
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'A toolbox you can hold onto.' }),
    ).toBeVisible()

    // Wait until the SW has activated and claimed this page. Otherwise the
    // offline reload is a plain network request and fails with
    // ERR_INTERNET_DISCONNECTED instead of being served from the cache.
    await page.evaluate(async () => {
      const sw = (globalThis as unknown as {
        navigator: {
          serviceWorker: {
            ready: Promise<void>
            controller: unknown
            addEventListener(type: string, cb: () => void, opts?: { once?: boolean }): void
          }
        }
      }).navigator.serviceWorker
      await sw.ready
      if (!sw.controller) {
        await new Promise<void>((resolve) =>
          sw.addEventListener('controllerchange', () => resolve(), { once: true }),
        )
      }
    })

    try {
      await page.context().setOffline(true)
      await page.reload({ waitUntil: 'domcontentloaded' })
      // The shell should still render from the SW cache.
      await expect(
        page.getByRole('heading', { name: 'A toolbox you can hold onto.' }),
      ).toBeVisible()
    } finally {
      await page.context().setOffline(false)
    }
  })
})
