import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load repo-root .env so drizzle-kit sees DATABASE_URL.
config({ path: "../../.env" });

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
