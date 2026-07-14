import { healthSchema } from "@coauthor/shared";

export default function Home() {
  // Verifies the shared Zod package is importable across the workspace (task 0.3).
  const health = healthSchema.parse({ ok: true });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Coauthor</h1>
      <p className="text-neutral-600">
        Collaborative document editor — scaffold online (shared schema ok:{" "}
        {String(health.ok)}).
      </p>
    </main>
  );
}
