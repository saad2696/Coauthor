"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/lib/auth-context";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (isSignup) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? humanizeAuthError(err.message)
          : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Coauthor</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {isSignup ? "Create your account" : "Sign in to your account"}
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            required
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          />
        </label>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
        >
          {busy ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-500">
        {isSignup ? "Already have an account? " : "Don't have an account? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-neutral-900 underline"
        >
          {isSignup ? "Log in" : "Sign up"}
        </Link>
      </p>
    </div>
  );
}

function humanizeAuthError(message: string): string {
  if (message.includes("auth/invalid-credential")) return "Invalid email or password.";
  if (message.includes("auth/email-already-in-use"))
    return "An account with that email already exists.";
  if (message.includes("auth/weak-password"))
    return "Password must be at least 6 characters.";
  if (message.includes("auth/invalid-email")) return "Enter a valid email address.";
  return message;
}
