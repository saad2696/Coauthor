"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { AuthShell, Field, SubmitButton } from "@/components/ui/auth-shell";

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
        err instanceof Error ? humanizeAuthError(err.message) : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your account">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <SubmitButton busy={busy}>Log in</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-indigo-600 hover:underline">
          Sign up
        </Link>
      </p>

      <div className="mt-5 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
        <p className="mb-1 font-semibold text-neutral-700">Demo accounts</p>
        <p>
          <span className="font-mono">alice@test.ajaia.dev</span> /{" "}
          <span className="font-mono">password123</span>
        </p>
        <p>
          <span className="font-mono">bob@test.ajaia.dev</span> /{" "}
          <span className="font-mono">password123</span>
        </p>
      </div>
    </AuthShell>
  );
}

function humanizeAuthError(message: string): string {
  if (message.includes("auth/invalid-credential")) return "Invalid email or password.";
  if (message.includes("auth/user-not-found")) return "No account with that email.";
  if (message.includes("auth/wrong-password")) return "Incorrect password.";
  if (message.includes("auth/invalid-email")) return "Enter a valid email address.";
  return message;
}
