"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AuthShell, Field, SubmitButton } from "@/components/ui/auth-shell";

/**
 * Signup: collect name + email. The backend creates the account with a
 * generated password; we then send a password-reset email so the user sets
 * their own password (no password entered on the frontend).
 */
export function SignupForm() {
  const { sendPasswordReset } = useAuth();
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
      await api.register(name.trim(), email.trim());
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(
          err instanceof Error ? humanizeAuthError(err.message) : "Something went wrong.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle="Almost there">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
            <MailCheck size={22} />
          </span>
          <p className="text-sm text-neutral-600">
            Your account was created. We sent a password-setup email to{" "}
            <span className="font-medium text-neutral-900">{email}</span>. Open
            it to set your password, then log in.
          </p>
          <Link
            href="/login"
            className="mt-1 text-sm font-medium text-indigo-600 hover:underline"
          >
            Go to login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="We'll email you a link to set your password"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Name">
          <input
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="auth-input"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <SubmitButton busy={busy}>Create account</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}

function humanizeAuthError(message: string): string {
  if (message.includes("auth/invalid-email")) return "Enter a valid email address.";
  if (message.includes("auth/too-many-requests"))
    return "Too many attempts. Please try again in a moment.";
  return message;
}
