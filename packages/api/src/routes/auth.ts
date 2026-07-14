import { users } from "@coauthor/db";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

import { badRequest } from "../lib/errors";
import type { AppDeps, AppEnv } from "../types";

/**
 * POST /auth/sync — mirrors the authenticated Firebase user into the `users`
 * table (D5). Idempotent upsert keyed on the Firebase UID.
 */
export function authRoutes(deps: AppDeps) {
  const app = new Hono<AppEnv>();

  app.post("/sync", async (c) => {
    const user = c.get("user");
    if (!user.email) {
      throw badRequest("Authenticated user has no email address");
    }

    const [row] = await deps.db
      .insert(users)
      .values({ id: user.uid, email: user.email })
      .onConflictDoUpdate({
        target: users.id,
        set: { email: sql`excluded.email` },
      })
      .returning();

    return c.json({ user: row }, 200);
  });

  return app;
}
