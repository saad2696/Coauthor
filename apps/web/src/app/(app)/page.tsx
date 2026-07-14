"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { api, type Doc, type SharedDoc } from "@/lib/api";
import { timeAgo } from "@/lib/format";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["documents"],
    queryFn: api.listDocuments,
  });

  const createDoc = useMutation({
    mutationFn: () => api.createDocument(),
    onSuccess: ({ document }) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      router.push(`/docs/${document.id}`);
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Coauthor</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-500">{user?.email}</span>
          <button
            onClick={() => logout()}
            className="rounded-md border border-neutral-300 px-3 py-1 hover:bg-neutral-50"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-medium">Your documents</h2>
        <button
          onClick={() => createDoc.mutate()}
          disabled={createDoc.isPending}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {createDoc.isPending ? "Creating…" : "New document"}
        </button>
      </div>

      {isLoading && (
        <p className="mt-8 text-sm text-neutral-500">Loading documents…</p>
      )}
      {isError && (
        <p className="mt-8 text-sm text-red-600">
          Failed to load documents. Try refreshing.
        </p>
      )}

      {data && (
        <div className="mt-6 flex flex-col gap-8">
          <Section title="My documents">
            {data.owned.length === 0 ? (
              <EmptyState text="No documents yet. Click “New document” to start." />
            ) : (
              data.owned.map((doc) => <DocumentRow key={doc.id} doc={doc} />)
            )}
          </Section>

          <Section title="Shared with me">
            {data.shared.length === 0 ? (
              <EmptyState text="Nothing shared with you yet." />
            ) : (
              data.shared.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} role={doc.role} />
              ))
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h3>
      <div className="flex flex-col divide-y divide-neutral-100 rounded-lg border border-neutral-200">
        {children}
      </div>
    </section>
  );
}

function DocumentRow({
  doc,
  role,
}: {
  doc: Doc | SharedDoc;
  role?: "viewer" | "editor";
}) {
  return (
    <Link
      href={`/docs/${doc.id}`}
      className="flex items-center justify-between px-4 py-3 transition hover:bg-neutral-50"
    >
      <span className="font-medium text-neutral-900">{doc.title}</span>
      <span className="flex items-center gap-3 text-xs text-neutral-500">
        {role && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium uppercase tracking-wide text-neutral-600">
            {role}
          </span>
        )}
        updated {timeAgo(doc.updatedAt)}
      </span>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="px-4 py-6 text-sm text-neutral-400">{text}</p>;
}
