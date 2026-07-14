import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Load repo-root .env so tests get a DB URL. Prefer TEST_DATABASE_URL (a Neon
// branch or local Postgres) if set; otherwise fall back to DATABASE_URL. All
// tests use uniquely-prefixed fixtures and clean up, never touching seed data.
config({ path: "../../.env" });

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Serial execution — the suite shares one database.
    fileParallelism: false,
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
