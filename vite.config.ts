import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/MH-toolbox/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'steady',
        short_name: 'steady',
        description: 'A toolbox you can hold onto.',
        theme_color: '#a24d35',
        background_color: '#faf6f1',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/MH-toolbox/',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          // Storage images (signed URLs are transient) — network-first so the
          // freshest URL wins online, cached copy only as an offline fallback.
          {
            urlPattern: /\/storage\/v1\/object\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'steady-media',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
            },
          },
          // The Supabase API itself is never cached — auth + data must be live.
          {
            urlPattern: /^https:\/\/xxtavjeetzvtlhwoenho\.supabase\.co\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**'],
    // Hosted-Supabase suites (parity + RLS) do many sequential network round
    // trips; the 5s default times out under parallel file execution.
    testTimeout: 20000,
    // The hosted parity suite creates a user + signs in per test in beforeEach;
    // accumulated network latency can exceed the 10s default hook timeout.
    hookTimeout: 30000,
  },
})
