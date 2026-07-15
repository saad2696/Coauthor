"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import {
  api,
  ApiError,
  type Collaborator,
  type Doc,
  type SharedDoc,
} from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useConfirm } from "@/lib/confirm";
import { useToast } from "@/lib/toast";
import { AppBar } from "@/components/ui/app-bar";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();

  const { data, isError, isFetching, refetch } = useQuery({
    queryKey: ["documents"],
    queryFn: api.listDocuments,
  });

  const fileInput = useRef<HTMLInputElement>(null);

  const createDoc = useMutation({
    mutationFn: () => api.createDocument(),
    onSuccess: ({ document }) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      router.push(`/docs/${document.id}`);
    },
    onError: (err) =>
      toast(err instanceof ApiError ? err.message : "Could not create document."),
  });

  const importDoc = useMutation({
    mutationFn: (file: File) => api.importFile(file),
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      router.push(`/docs/${id}`);
    },
    onError: (err) =>
      toast(err instanceof ApiError ? err.message : "Import failed. Try again."),
  });

  const deleteDoc = useMutation({
    mutationFn: (docId: string) => api.deleteDocument(docId),
    onSuccess: (_res, docId) => {
      queryClient.setQueryData(
        ["documents"],
        (old: { owned: Doc[]; shared: SharedDoc[] } | undefined) =>
          old ? { ...old, owned: old.owned.filter((d) => d.id !== docId) } : old,
      );
      toast("Document deleted.", "success");
    },
    onError: (err) =>
      toast(err instanceof ApiError ? err.message : "Could not delete document."),
  });

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) importDoc.mutate(file);
    e.target.value = "";
  }

  return (
    <div className="min-h-screen">
      <AppBar />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Your documents
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Create, import, and collaborate on rich-text documents.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh"
              aria-label="Refresh documents"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
            </button>
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
              title="Import a .txt or .md file (up to 1 MB)"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
            >
              <Upload size={16} />
              {importDoc.isPending ? "Importing…" : "Import"}
            </button>
            <button
              onClick={() => createDoc.mutate()}
              disabled={createDoc.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-700 disabled:opacity-50"
            >
              <Plus size={16} />
              {createDoc.isPending ? "Creating…" : "New document"}
            </button>
          </div>
        </div>

        {isError && (
          <p className="mt-10 text-sm text-red-600">
            Failed to load documents. Try refreshing.
          </p>
        )}

        {isFetching && (
          <div className="mt-10 flex flex-col gap-10">
            <SkeletonSection />
            <SkeletonSection />
          </div>
        )}

        {!isFetching && data && (
          <div className="mt-10 flex flex-col gap-10">
            <Section
              title="My documents"
              count={data.owned.length}
              empty="No documents yet — create one or import a file to get started."
            >
              {data.owned.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  collaborators={doc.collaborators}
                  onDelete={async () => {
                    const ok = await confirm({
                      title: "Delete document",
                      message: `"${doc.title}" will be permanently deleted. This can't be undone.`,
                      confirmLabel: "Delete",
                      danger: true,
                    });
                    if (ok) deleteDoc.mutate(doc.id);
                  }}
                />
              ))}
            </Section>

            <Section
              title="Shared with me"
              count={data.shared.length}
              empty="Nothing has been shared with you yet."
            >
              {data.shared.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} role={doc.role} />
              ))}
            </Section>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {title}
        </h2>
        <span className="rounded-full bg-neutral-200/70 px-2 py-0.5 text-xs font-medium text-neutral-600">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white/50 px-6 py-10 text-center text-sm text-neutral-400">
          {empty}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      )}
    </section>
  );
}

function DocumentCard({
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
    <div className="group relative">
      <Link
        href={`/docs/${doc.id}`}
        className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
      >
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900">
            <FileText size={18} />
          </span>
          {role && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
              {role}
            </span>
          )}
        </div>

        <h3 className="mt-4 line-clamp-2 font-medium text-neutral-900">
          {doc.title}
        </h3>

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-xs text-neutral-400">
            {timeAgo(doc.updatedAt)}
          </span>
          {collaborators && collaborators.length > 0 && (
            <Avatars collaborators={collaborators} />
          )}
        </div>
      </Link>

      {onDelete && (
        <button
          aria-label="Delete document"
          title="Delete document"
          onClick={onDelete}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

function labelFor(c: Collaborator): string {
  return c.displayName || c.email.split("@")[0] || c.email;
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
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-neutral-800 text-[10px] font-semibold uppercase text-white"
        >
          {labelFor(c).charAt(0)}
        </span>
      ))}
      {extra > 0 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-neutral-300 text-[10px] font-semibold text-neutral-700">
          +{extra}
        </span>
      )}
    </span>
  );
}

function SkeletonSection() {
  return (
    <section>
      <Skeleton className="mb-3 h-4 w-32" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-200 bg-white p-5"
          >
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="mt-4 h-4 w-3/4" />
            <Skeleton className="mt-6 h-3 w-20" />
          </div>
        ))}
      </div>
    </section>
  );
}

