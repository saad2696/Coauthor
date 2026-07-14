import { users } from "@coauthor/db";
import { and, ilike, ne, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { zv } from "../lib/validator";
import type { AppDeps, AppEnv } from "../types";

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});

/**
 * GET /users/search?q= — typeahead over registered users (email or name),
 * excluding the caller. Powers the share dialog so owners only pick users that
 * exist on the platform (avoids the USER_NOT_FOUND dead-end).
 */
export function userRoutes(deps: AppDeps) {
  const app = new Hono<AppEnv>();

  app.get("/search", zv("query", searchQuerySchema), async (c) => {
    const uid = c.get("user").uid;
    const { q } = c.req.valid("query");
    const pattern = `%${q}%`;

    const rows = await deps.db
      .select({
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(
        and(
          ne(users.id, uid),
          or(ilike(users.email, pattern), ilike(users.displayName, pattern)),
        ),
      )
      .limit(8);

    return c.json({ users: rows });
  });

  return app;
}
