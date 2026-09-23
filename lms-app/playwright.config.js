import { defineConfig, devices } from '@playwright/test';

/* ============================================================================
   Browser end-to-end tests (npm run e2e)

   npm run e2e       runs against the dev server (React StrictMode on)
   npm run e2e:prod  builds, then runs against the production build (preview)

   Playwright starts the server itself, or reuses one already running on the
   same port. First run on a new machine: npx playwright install chromium
   ============================================================================ */

const PROD = !!process.env.E2E_PROD;
const port = PROD ? 4173 : 5173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}/`,
    viewport: { width: 1200, height: 860 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1200, height: 860 } } }],
  webServer: {
    command: PROD
      ? `npm run build && npx vite preview --port ${port} --strictPort`
      : `npx vite --port ${port} --strictPort`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
