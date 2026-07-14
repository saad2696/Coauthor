import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

/**
 * Creates a Drizzle client over Neon's serverless HTTP driver (D3 — no
 * connection pool to manage on Vercel). Pass a connection string explicitly so
 * tests can point at a separate database.
 */
export function createDb(connectionString: string) {
  if (!connectionString) {
    throw new Error("createDb: connectionString is required (set DATABASE_URL)");
  }
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

let cached: Database | undefined;

/**
 * Lazily instantiates a singleton client from DATABASE_URL. Used by the API in
 * production; tests call createDb() with their own URL.
 */
export function getDb(): Database {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    cached = createDb(url);
  }
  return cached;
}
