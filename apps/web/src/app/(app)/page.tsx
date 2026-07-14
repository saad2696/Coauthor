"use client";

import { useAuth } from "@/lib/auth-context";

// Placeholder authed home — replaced by the full dashboard in task 4.4.
export default function DashboardPage() {
  const { user, logout } = useAuth();
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold">Signed in as {user?.email}</h1>
      <button
        onClick={() => logout()}
        className="mt-4 rounded-md border px-3 py-1 text-sm"
      >
        Log out
      </button>
    </main>
  );
}
