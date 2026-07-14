import { users } from "@coauthor/db";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

import { badRequest } from "../lib/errors";
import type { AppDeps, AppEnv } from "../types";

/**
 * POST /auth/sync — mirrors the authenticated Firebase user into the `users`
 * table (D5). Idempotent upsert keyed on the Firebase UID. Accepts an optional
 * `{ displayName }` body (set at passwordless signup); on conflict the name is
 * only updated when provided, so password logins never clobber an existing name.
 */
export function authRoutes(deps: AppDeps) {
  const app = new Hono<AppEnv>();

  app.post("/sync", async (c) => {
    const user = c.get("user");
    if (!user.email) {
      throw badRequest("Authenticated user has no email address");
    }

    const body = (await c.req.json().catch(() => ({}))) as {
      displayName?: unknown;
    };
    const displayName =
      typeof body.displayName === "string" && body.displayName.trim()
        ? body.displayName.trim().slice(0, 100)
        : undefined;

    const [row] = await deps.db
      .insert(users)
      .values({
        id: user.uid,
        email: user.email,
        displayName: displayName ?? null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: sql`excluded.email`,
          // Preserve the existing name unless a new one was provided.
          displayName: sql`coalesce(${displayName ?? null}, ${users.displayName})`,
        },
      })
      .returning();

    return c.json({ user: row }, 200);
  });

  return app;
}
