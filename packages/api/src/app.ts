import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

import { AppError, errorBody } from "./lib/errors";
import { authMiddleware } from "./middleware/auth";
import { authRoutes } from "./routes/auth";
import type { AppDeps, AppEnv } from "./types";

/**
 * Hono app factory (design §3). The app has zero Next.js imports so it is
 * unit-testable via `app.request()` and portable. Mounted at `/api` by the
 * Next.js catch-all route.
 */
export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>().basePath("/api");

  // Unauthenticated health check (useful for deploy smoke tests).
  app.get("/health", (c) => c.json({ ok: true }));

  // Everything below requires a valid Firebase ID token.
  app.use("/*", authMiddleware(deps.verifyToken));

  app.route("/auth", authRoutes(deps));

  // Uniform error envelope (design §6/§8) — never leak stack traces.
  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(errorBody(err.code, err.message, err.details), err.status);
    }
    if (err instanceof ZodError) {
      return c.json(
        errorBody(
          "VALIDATION",
          "Request validation failed",
          err.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        ),
        400,
      );
    }
    if (err instanceof HTTPException) {
      return c.json(errorBody("BAD_REQUEST", err.message), err.status);
    }
    console.error("Unhandled API error:", err);
    return c.json(errorBody("INTERNAL", "Internal server error"), 500);
  });

  app.notFound((c) => c.json(errorBody("NOT_FOUND", "Route not found"), 404));

  return app;
}

export type AppType = ReturnType<typeof createApp>;
