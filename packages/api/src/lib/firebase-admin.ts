import {
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import type { AuthedUser, TokenVerifier } from "../types";

/**
 * Builds a TokenVerifier backed by firebase-admin (D4). The Admin SDK is
 * initialized from FIREBASE_SERVICE_ACCOUNT_JSON (base64-encoded JSON).
 */
export function createFirebaseVerifier(
  serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
): TokenVerifier {
  if (!serviceAccountBase64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
  }
  const serviceAccount = JSON.parse(
    Buffer.from(serviceAccountBase64, "base64").toString("utf8"),
  ) as ServiceAccount;

  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount) });
  }
  const auth = getAuth();

  return async (idToken: string): Promise<AuthedUser> => {
    const decoded = await auth.verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email ?? null };
  };
}
