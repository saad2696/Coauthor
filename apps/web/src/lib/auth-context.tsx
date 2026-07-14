"use client";

import {
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { auth } from "./firebase";

const SIGNUP_EMAIL_KEY = "coauthor:signupEmail";
const SIGNUP_NAME_KEY = "coauthor:signupName";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  getIdToken: () => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<void>;
  sendSignupLink: (name: string, email: string) => Promise<void>;
  completeSignInFromLink: () => Promise<"completed" | "not-a-link">;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Mirrors the authenticated user into Postgres (POST /api/auth/sync). */
async function syncUser(user: User, displayName?: string) {
  const token = await user.getIdToken();
  await fetch("/api/auth/sync", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(displayName ? { displayName } : {}),
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const getIdToken = useCallback(async () => {
    return auth.currentUser ? auth.currentUser.getIdToken() : null;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await syncUser(cred.user);
  }, []);

  // Passwordless signup: email a magic sign-in link, stash name+email locally.
  const sendSignupLink = useCallback(async (name: string, email: string) => {
    await sendSignInLinkToEmail(auth, email, {
      url: `${window.location.origin}/auth/finish`,
      handleCodeInApp: true,
    });
    window.localStorage.setItem(SIGNUP_EMAIL_KEY, email);
    window.localStorage.setItem(SIGNUP_NAME_KEY, name);
  }, []);

  // Completes sign-in when the user returns via the emailed link.
  const completeSignInFromLink = useCallback(async (): Promise<
    "completed" | "not-a-link"
  > => {
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      return "not-a-link";
    }
    let email = window.localStorage.getItem(SIGNUP_EMAIL_KEY);
    if (!email) {
      // Opened on a different device/browser — ask for the email again.
      email = window.prompt("Please confirm your email to finish signing in");
    }
    if (!email) throw new Error("Email is required to complete sign-in.");

    const cred = await signInWithEmailLink(auth, email, window.location.href);
    const name = window.localStorage.getItem(SIGNUP_NAME_KEY) ?? undefined;
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }
    await syncUser(cred.user, name);
    window.localStorage.removeItem(SIGNUP_EMAIL_KEY);
    window.localStorage.removeItem(SIGNUP_NAME_KEY);
    return "completed";
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      getIdToken,
      signIn,
      sendSignupLink,
      completeSignInFromLink,
      logout,
    }),
    [
      user,
      loading,
      getIdToken,
      signIn,
      sendSignupLink,
      completeSignInFromLink,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
