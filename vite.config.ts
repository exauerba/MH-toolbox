import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// TODO(WP1/WP2): add vite-plugin-pwa with base '/MH-toolbox/', network-only for Supabase API, network-first for storage images

export default defineConfig({
  base: '/MH-toolbox/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**'],
    // Hosted-Supabase suites (parity + RLS) do many sequential network round
    // trips; the 5s default times out under parallel file execution.
    testTimeout: 20000,
  },
})
