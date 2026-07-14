import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

// Load repo-root .env.
config({ path: "../../.env" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — cannot run migrations");
  }
  const db = drizzle(neon(url));
  console.log("Running migrations…");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
