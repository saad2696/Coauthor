import type { Database } from "@coauthor/db";

export interface AuthedUser {
  uid: string;
  email: string | null;
}

/** Verifies a Firebase ID token and returns the authenticated user. */
export type TokenVerifier = (idToken: string) => Promise<AuthedUser>;

/** Dependencies injected into the Hono app factory (keeps it testable). */
export interface AppDeps {
  db: Database;
  verifyToken: TokenVerifier;
}

/** Hono environment bindings — `c.get("user")` is the authed user. */
export interface AppEnv {
  Variables: {
    user: AuthedUser;
  };
}
