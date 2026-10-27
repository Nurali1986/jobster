import { defineConfig, devices } from "@playwright/test";

const TEST_PORT = 3100;
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://worktime:worktime_secret@localhost:5432/worktime_test_db?schema=public";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${TEST_PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.CI ? undefined : "chrome",
      },
    },
  ],
  webServer: {
    command: `npx next dev -p ${TEST_PORT}`,
    url: `http://localhost:${TEST_PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      DATABASE_URL: TEST_DATABASE_URL,
    },
  },
});
