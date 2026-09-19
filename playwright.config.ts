import { defineConfig, devices } from '@playwright/test';

/**
 * The browser harness exists because the Vitest suite runs in jsdom, which has
 * no layout engine: there, getBoundingClientRect returns zeros and any claim
 * about what the page measures passes whatever the stylesheet says. Everything
 * asserted under e2e/ needs a real engine, so it lives here and not in Vitest.
 */
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  /*
   * The built app rather than the dev server, so what is measured is what
   * ships: the dev server serves unminified CSS through a different pipeline.
   */
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    // Never reuse a server already on this port: it would measure whatever
    // build that one happens to be serving.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
