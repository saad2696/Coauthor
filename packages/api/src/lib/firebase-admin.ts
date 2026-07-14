import {
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import type { AuthAdmin, AuthedUser, TokenVerifier } from "../types";

function ensureAdminApp(
  serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
) {
  if (!serviceAccountBase64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
  }
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountBase64, "base64").toString("utf8"),
    ) as ServiceAccount;
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getAuth();
}

/** Firebase Admin-backed user provisioning (server-side createUser). */
export function createFirebaseAuthAdmin(
  serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
): AuthAdmin {
  const auth = ensureAdminApp(serviceAccountBase64);
  return {
    async createUser({ email, password, displayName }) {
      try {
        const rec = await auth.createUser({ email, password, displayName });
        return { uid: rec.uid };
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          err.code === "auth/email-already-exists"
        ) {
          const e = new Error("EMAIL_EXISTS");
          e.name = "EMAIL_EXISTS";
          throw e;
        }
        throw err;
      }
    },
  };
}

/**
 * Builds a TokenVerifier backed by firebase-admin (D4). The Admin SDK is
 * initialized from FIREBASE_SERVICE_ACCOUNT_JSON (base64-encoded JSON).
 */
export function createFirebaseVerifier(
  serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
): TokenVerifier {
  const auth = ensureAdminApp(serviceAccountBase64);

  return async (idToken: string): Promise<AuthedUser> => {
    const decoded = await auth.verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email ?? null };
  };
}
