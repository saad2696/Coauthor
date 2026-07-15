import { users } from "@coauthor/db";
import { and, asc, ilike, ne, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { zv } from "../lib/validator";
import type { AppDeps, AppEnv } from "../types";

const searchQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

/**
 * GET /users/search?q=&limit=&offset= — paginated directory of registered users
 * (optionally filtered by email/name), excluding the caller. Powers the share
 * dialog's browse + infinite scroll. Returns { users, nextOffset }.
 */
export function userRoutes(deps: AppDeps) {
  const app = new Hono<AppEnv>();

  app.get("/search", zv("query", searchQuerySchema), async (c) => {
    const uid = c.get("user").uid;
    const { q, limit, offset } = c.req.valid("query");

    const conditions = [ne(users.id, uid)];
    if (q) {
      conditions.push(
        or(ilike(users.email, `%${q}%`), ilike(users.displayName, `%${q}%`))!,
      );
    }

    // Fetch one extra row to detect whether another page exists.
    const rows = await deps.db
      .select({
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(asc(users.email))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    return c.json({
      users: rows.slice(0, limit),
      nextOffset: hasMore ? offset + limit : null,
    });
  });

  return app;
}
