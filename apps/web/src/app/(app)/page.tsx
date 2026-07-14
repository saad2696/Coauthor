"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import {
  api,
  ApiError,
  type Collaborator,
  type Doc,
  type SharedDoc,
} from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useToast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["documents"],
    queryFn: api.listDocuments,
  });

  const fileInput = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const createDoc = useMutation({
    mutationFn: () => api.createDocument(),
    onSuccess: ({ document }) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      router.push(`/docs/${document.id}`);
    },
    onError: (err) =>
      toast(
        err instanceof ApiError ? err.message : "Could not create document.",
      ),
  });

  const importDoc = useMutation({
    mutationFn: (file: File) => api.importFile(file),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      router.push(`/docs/${id}`);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Import failed. Try again.";
      setImportError(msg);
      toast(msg);
    },
  });

  const deleteDoc = useMutation({
    mutationFn: (docId: string) => api.deleteDocument(docId),
    onSuccess: (_res, docId) => {
      queryClient.setQueryData(
        ["documents"],
        (old: { owned: Doc[]; shared: SharedDoc[] } | undefined) =>
          old
            ? { ...old, owned: old.owned.filter((d) => d.id !== docId) }
            : old,
      );
      toast("Document deleted.", "success");
    },
    onError: (err) =>
      toast(
        err instanceof ApiError ? err.message : "Could not delete document.",
      ),
  });

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError(null);
    const file = e.target.files?.[0];
    if (file) importDoc.mutate(file);
    e.target.value = "";
  }

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

      <div className="mt-6 flex items-start justify-between">
        <h2 className="text-lg font-medium">Your documents</h2>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={onPickFile}
              className="hidden"
            />
            <button
              onClick={() => fileInput.current?.click()}
              disabled={importDoc.isPending}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              {importDoc.isPending ? "Importing…" : "Import file"}
            </button>
            <button
              onClick={() => createDoc.mutate()}
              disabled={createDoc.isPending}
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {createDoc.isPending ? "Creating…" : "New document"}
            </button>
          </div>
          <p className="text-xs text-neutral-400">
            Import supports .txt and .md, up to 1 MB.
          </p>
          {importError && (
            <p className="text-xs text-red-600">{importError}</p>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="mt-6 flex flex-col gap-8">
          <SkeletonSection />
          <SkeletonSection />
        </div>
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
              data.owned.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  collaborators={doc.collaborators}
                  onDelete={() => {
                    if (
                      window.confirm(
                        `Delete "${doc.title}"? This can't be undone.`,
                      )
                    ) {
                      deleteDoc.mutate(doc.id);
                    }
                  }}
                />
              ))
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
  collaborators,
  onDelete,
}: {
  doc: Doc | SharedDoc;
  role?: "viewer" | "editor";
  collaborators?: Collaborator[];
  onDelete?: () => void;
}) {
  return (
    <Link
      href={`/docs/${doc.id}`}
      className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-neutral-50"
    >
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-neutral-900">
          {doc.title}
        </span>
        {collaborators && collaborators.length > 0 && (
          <span className="mt-0.5 truncate text-xs text-neutral-400">
            Shared with {formatCollaborators(collaborators)}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-3 text-xs text-neutral-500">
        {collaborators && collaborators.length > 0 && (
          <Avatars collaborators={collaborators} />
        )}
        {role && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium uppercase tracking-wide text-neutral-600">
            {role}
          </span>
        )}
        <span className="whitespace-nowrap">updated {timeAgo(doc.updatedAt)}</span>
        {onDelete && (
          <button
            aria-label="Delete document"
            title="Delete document"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-1 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        )}
      </span>
    </Link>
  );
}

function labelFor(c: Collaborator): string {
  return c.displayName || c.email.split("@")[0] || c.email;
}

function formatCollaborators(collaborators: Collaborator[]): string {
  const names = collaborators.map(labelFor);
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

function Avatars({ collaborators }: { collaborators: Collaborator[] }) {
  const shown = collaborators.slice(0, 3);
  const extra = collaborators.length - shown.length;
  return (
    <span className="flex -space-x-1.5">
      {shown.map((c) => (
        <span
          key={c.userId}
          title={`${labelFor(c)} (${c.role})`}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-neutral-800 text-[10px] font-medium uppercase text-white"
        >
          {labelFor(c).charAt(0)}
        </span>
      ))}
      {extra > 0 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-neutral-300 text-[10px] font-medium text-neutral-700">
          +{extra}
        </span>
      )}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="px-4 py-6 text-sm text-neutral-400">{text}</p>;
}

function SkeletonSection() {
  return (
    <section>
      <Skeleton className="mb-2 h-3 w-32" />
      <div className="flex flex-col divide-y divide-neutral-100 rounded-lg border border-neutral-200">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </section>
  );
}
