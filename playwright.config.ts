import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173/MH-toolbox/',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Serve the built app (vite preview) instead of the dev server: static
    // files load in ms instead of triggering on-demand Vite transforms per page.
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/MH-toolbox/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
