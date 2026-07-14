import { randomBytes } from "node:crypto";

import { users } from "@coauthor/db";
import { signupSchema } from "@coauthor/shared";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

import { badRequest, conflict } from "../lib/errors";
import { zv } from "../lib/validator";
import type { AppDeps, AppEnv } from "../types";

/** A strong random password set by the backend at signup. The user never sees
 * it — they set their own via the password-reset email. */
function generatePassword(): string {
  return `${randomBytes(24).toString("base64url")}Aa1!`;
}

/**
 * Public auth routes (no token required). POST /auth/register provisions a
 * Firebase user with a backend-set random password + display name, and mirrors
 * it into Postgres. The frontend then triggers a password-reset email so the
 * user chooses their own password.
 */
export function publicAuthRoutes(deps: AppDeps) {
  const app = new Hono<AppEnv>();

  app.post("/register", zv("json", signupSchema), async (c) => {
    const { name, email } = c.req.valid("json");

    let uid: string;
    try {
      ({ uid } = await deps.auth.createUser({
        email,
        password: generatePassword(),
        displayName: name,
      }));
    } catch (err) {
      if (err instanceof Error && err.name === "EMAIL_EXISTS") {
        throw conflict(
          "An account with this email already exists. Try logging in.",
        );
      }
      throw err;
    }

    await deps.db
      .insert(users)
      .values({ id: uid, email, displayName: name })
      .onConflictDoUpdate({
        target: users.id,
        set: { email: sql`excluded.email`, displayName: sql`excluded.display_name` },
      });

    return c.json({ email }, 201);
  });

  return app;
}

/**
 * Protected auth routes. POST /auth/sync mirrors the authenticated Firebase
 * user into `users` (D5). Optional `{ displayName }` body; on conflict the name
 * is only updated when provided, so password logins never clobber a name.
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
          displayName: sql`coalesce(${displayName ?? null}, ${users.displayName})`,
        },
      })
      .returning();

    return c.json({ user: row }, 200);
  });

  return app;
}
