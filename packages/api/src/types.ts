import type { Database } from "@coauthor/db";

export interface AuthedUser {
  uid: string;
  email: string | null;
}

/** Verifies a Firebase ID token and returns the authenticated user. */
export type TokenVerifier = (idToken: string) => Promise<AuthedUser>;

/** Server-side user provisioning (Firebase Admin). */
export interface AuthAdmin {
  /** Creates a Firebase user with the given password + display name. Throws
   * with code "EMAIL_EXISTS" if the email is already registered. */
  createUser: (input: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<{ uid: string }>;
}

/** Dependencies injected into the Hono app factory (keeps it testable). */
export interface AppDeps {
  db: Database;
  verifyToken: TokenVerifier;
  auth: AuthAdmin;
}

/** Hono environment bindings — `c.get("user")` is the authed user. */
export interface AppEnv {
  Variables: {
    user: AuthedUser;
  };
}
