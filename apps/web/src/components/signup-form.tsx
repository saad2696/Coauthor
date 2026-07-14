"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/lib/auth-context";

/** Passwordless signup: collect name + email, email a magic sign-in link. */
export function SignupForm() {
  const { sendSignupLink } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 1) {
      setError("Please enter your name.");
      return;
    }
    setBusy(true);
    try {
      await sendSignupLink(name.trim(), email.trim());
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? humanizeAuthError(err.message) : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-sm text-neutral-600">
          We sent a sign-in link to <span className="font-medium">{email}</span>.
          Open it on this device to finish creating your account — no password
          needed.
        </p>
        <Link href="/login" className="text-sm text-neutral-900 underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Coauthor</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Create your account — we&apos;ll email you a sign-in link
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          />
        </label>
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
          {busy ? "Sending link…" : "Email me a sign-in link"}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-neutral-900 underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

function humanizeAuthError(message: string): string {
  if (message.includes("auth/invalid-email")) return "Enter a valid email address.";
  if (message.includes("auth/operation-not-allowed"))
    return "Email-link sign-in is not enabled. Enable it in Firebase Auth settings.";
  if (message.includes("auth/unauthorized-continue-uri"))
    return "This domain is not authorized in Firebase Auth settings.";
  return message;
}
