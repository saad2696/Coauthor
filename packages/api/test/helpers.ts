import { config } from "dotenv";
import {
  createDb,
  type Database,
} from "@coauthor/db";

import { createApp } from "../src/index";
import type { AppType } from "../src/index";

config({ path: "../../.env" });

/**
 * Test harness: the real Hono app over a real database, with auth **bypassed**
 * via an injected verifier (equivalent to design §9's TEST_AUTH_BYPASS) — the
 * bearer token IS the user id. Firebase Admin `createUser` is stubbed so no real
 * Firebase users are created.
 */
export function makeTestApp(): { app: AppType; db: Database } {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Set TEST_DATABASE_URL or DATABASE_URL to run tests");
  }
  const db = createDb(url);
  const app = createApp({
    db,
    verifyToken: async (token) => ({
      uid: token,
      email: `${token}@t8.local`,
    }),
    auth: {
      createUser: async ({ email }) => ({ uid: `t8-uid-${email}` }),
    },
  });
  return { app, db };
}

/** Authorization header whose bearer token is the given user id. */
export function as(uid: string): Record<string, string> {
  return { Authorization: `Bearer ${uid}` };
}

export function jsonHeaders(uid: string): Record<string, string> {
  return { ...as(uid), "Content-Type": "application/json" };
}
