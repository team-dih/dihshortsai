import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: { baseURL: "http://127.0.0.1:3321", channel: process.env.PLAYWRIGHT_CHANNEL },
  webServer: {
    command: "bun run start --hostname 127.0.0.1 --port 3321",
    url: "http://127.0.0.1:3321",
  },
});

