import { createMiddleware } from "hono/factory";

import { unauthorized } from "../lib/errors";
import type { AppEnv, TokenVerifier } from "../types";

/**
 * Auth middleware (design §6): reads `Authorization: Bearer <idToken>`,
 * verifies it, and sets `c.var.user`. Throws 401 otherwise. Verification is
 * injected (TokenVerifier) so tests can bypass Firebase.
 */
export function authMiddleware(verifyToken: TokenVerifier) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header || !header.startsWith("Bearer ")) {
      throw unauthorized("Missing or malformed Authorization header");
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      throw unauthorized("Empty bearer token");
    }
    try {
      const user = await verifyToken(token);
      c.set("user", user);
    } catch {
      throw unauthorized("Invalid or expired token");
    }
    await next();
  });
}
