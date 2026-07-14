"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/lib/auth-context";

/** Email/password login form. Signup is passwordless (see /signup). */
export function LoginForm() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
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
        <p className="mt-1 text-sm text-neutral-500">Sign in to your account</p>
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
            autoComplete="current-password"
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
          {busy ? "Please wait…" : "Log in"}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-neutral-900 underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

function humanizeAuthError(message: string): string {
  if (message.includes("auth/invalid-credential")) return "Invalid email or password.";
  if (message.includes("auth/user-not-found")) return "No account with that email.";
  if (message.includes("auth/wrong-password")) return "Incorrect password.";
  if (message.includes("auth/invalid-email")) return "Enter a valid email address.";
  return message;
}
