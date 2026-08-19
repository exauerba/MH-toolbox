// Lighthouse CI config — runs Lighthouse against the built app (vite preview)
// and asserts the Wave-4 quality budgets. Invoked via `npx lhci autorun`.
module.exports = {
  ci: {
    collect: {
      // Build then serve the production bundle (same as the E2E webServer).
      startServerCommand: 'npm run build && npm run preview',
      url: ['http://localhost:4173/MH-toolbox/'],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        // The app is a client-side SPA behind a hash router; only the shell
        // route is audited (all routes share the same shell + assets).
        chromeFlags: '--no-sandbox',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: 'lhci-artifacts',
    },
  },
}
