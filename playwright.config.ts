import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright — the robot that clicks through the app in a real browser and
 * checks that what it sees is what should be there.
 *
 * Run every test:        npm test
 * Watch it happen:       npm run test:ui
 *
 * The robot starts its own copy of the app on this computer and tests that.
 * That copy talks to the TEST database ("the-pickle-test"), using the
 * settings in .env.test.local — never the live one. The tests create
 * pretend members, jars and pickles, and none of that belongs near real
 * people's data.
 *
 * The tests live in the `tests/` folder. The most important one, once it
 * exists, is the anonymity test: it proves no pickle ever travels to a
 * browser alongside the name of the person who wrote it.
 */

// The live database. The tests refuse to run if they are pointed at it.
const LIVE_PROJECT_REF = "jcbcisuffkkftrskcimt";

try {
  process.loadEnvFile(".env.test.local");
} catch {
  throw new Error(
    "The tests need .env.test.local, which points them at the test " +
      "database. See the notes at the top of playwright.config.ts.",
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (supabaseUrl.includes(LIVE_PROJECT_REF)) {
  throw new Error(
    "Refusing to run: the test settings point at the LIVE database. " +
      "Tests must only ever use the-pickle-test.",
  );
}

// Not 3000. If you have the app open yourself with `npm run dev`, that copy
// talks to the live database — and the robot must never reuse it.
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

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

  // Settings already present here outrank the app's own .env.local, so the
  // copy of the app started for testing picks up the test database.
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    },
  },
});
