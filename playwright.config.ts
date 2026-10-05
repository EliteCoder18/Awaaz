import { defineConfig, devices } from "@playwright/test";
const production = process.env.AWAAZ_E2E_MODE === "production";
const port = production ? 4174 : 4173;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: production
      ? "npm run preview -- --host 127.0.0.1 --port 4174 --strictPort"
      : "npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !production,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
});
