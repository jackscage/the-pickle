import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright — the robot that clicks through the app in a real browser and
 * checks that what it sees is what should be there.
 *
 * Run every test:        npm test
 * Watch it happen:       npm run test:ui
 *
 * By default the robot starts its own copy of the app on this computer
 * (`npm run dev`) and tests that. It never points at the live site unless
 * PLAYWRIGHT_BASE_URL is set to the live address on purpose.
 *
 * The tests live in the `tests/` folder. The most important one, once it
 * exists, is the anonymity test: it proves no pickle ever travels to a
 * browser alongside the name of the person who wrote it.
 */

const PORT = 3000;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // A test marked `.only` is a debugging leftover; refuse to run a partial
  // suite on the build server and call it a pass.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",

  use: {
    baseURL,
    // Keep a step-by-step recording when a test fails, so the failure can be
    // replayed instead of guessed at.
    trace: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Start the app locally unless we were pointed at an address already.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
