"use client";

import type { TiptapDoc } from "@coauthor/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";

import { api, ApiError, type Doc, type DocumentsList } from "@/lib/api";
import { useAutosave, type SaveState } from "@/lib/use-autosave";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { ShareDialog } from "@/components/editor/share-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["document", id],
    queryFn: () => api.getDocument(id),
    retry: false,
  });

  if (isLoading) return <EditorSkeleton />;

  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <CenterMessage
        text={
          notFound
            ? "This document doesn't exist or you don't have access to it."
            : "Failed to load this document."
        }
        withBack
      />
    );
  }
  if (!data) return null;

  const canEdit = data.access === "owner" || data.access === "editor";

  return (
    <DocumentEditor
      key={id}
      docId={id}
      initialTitle={data.document.title}
      initialContent={data.document.content}
      canEdit={canEdit}
      isOwner={data.access === "owner"}
      isViewer={data.access === "viewer"}
    />
  );
}

function DocumentEditor({
  docId,
  initialTitle,
  initialContent,
  canEdit,
  isOwner,
  isViewer,
}: {
  docId: string;
  initialTitle: string;
  initialContent: TiptapDoc;
  canEdit: boolean;
  isOwner: boolean;
  isViewer: boolean;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initialTitle);
  const [shareOpen, setShareOpen] = useState(false);

  // Patch both Query caches after a save so the dashboard reflects changes
  // instantly on back-navigation (no refetch delay).
  const patchCaches = useCallback(
    (doc: Doc) => {
      queryClient.setQueryData(
        ["document", docId],
        (old: { document: Doc; access: string } | undefined) =>
          old ? { ...old, document: doc } : old,
      );
      queryClient.setQueryData(
        ["documents"],
        (old: DocumentsList | undefined) => {
          if (!old) return old;
          const patch = <T extends Doc>(d: T): T =>
            d.id === doc.id
              ? { ...d, title: doc.title, updatedAt: doc.updatedAt }
              : d;
          return { owned: old.owned.map(patch), shared: old.shared.map(patch) };
        },
      );
    },
    [queryClient, docId],
  );

  const saveContent = useCallback(
    async (content: TiptapDoc) => {
      const { document } = await api.updateDocument(docId, { content });
      patchCaches(document);
    },
    [docId, patchCaches],
  );

  const saveTitle = useCallback(
    async (next: string) => {
      const { document } = await api.updateDocument(docId, { title: next });
      patchCaches(document);
    },
    [docId, patchCaches],
  );

  const content = useAutosave<TiptapDoc>(saveContent);
  const titleSave = useAutosave<string>(saveTitle);

  // Merge the two save states into one indicator.
  const saveState = mergeSaveState(content.state, titleSave.state);

  const onTitleChange = (value: string) => {
    setTitle(value);
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed !== initialTitle) {
      titleSave.schedule(trimmed);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-8">
      <div className="flex items-center justify-between text-sm">
        <Link href="/" className="text-neutral-500 hover:text-neutral-900">
          ← All documents
        </Link>
        <div className="flex items-center gap-3">
          {isViewer && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              View only
            </span>
          )}
          <SaveIndicator
            state={saveState}
            canEdit={canEdit}
            onRetry={() => {
              content.retry();
              titleSave.retry();
            }}
          />
          {isOwner && (
            <button
              onClick={() => setShareOpen(true)}
              className="rounded-md bg-neutral-900 px-3 py-1 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Share
            </button>
          )}
        </div>
      </div>

      {shareOpen && (
        <ShareDialog docId={docId} onClose={() => setShareOpen(false)} />
      )}

      <input
        value={title}
        disabled={!canEdit}
        maxLength={200}
        onChange={(e) => onTitleChange(e.target.value)}
        onBlur={() => titleSave.flush()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className="w-full border-none bg-transparent text-3xl font-semibold tracking-tight outline-none disabled:text-neutral-800"
        placeholder="Untitled document"
      />

      <TiptapEditor
        initialContent={initialContent}
        editable={canEdit}
        onChange={canEdit ? content.schedule : undefined}
      />
    </div>
  );
}

function mergeSaveState(a: SaveState, b: SaveState): SaveState {
  if (a === "error" || b === "error") return "error";
  if (a === "saving" || b === "saving") return "saving";
  if (a === "saved" || b === "saved") return "saved";
  return "idle";
}

function SaveIndicator({
  state,
  canEdit,
  onRetry,
}: {
  state: SaveState;
  canEdit: boolean;
  onRetry: () => void;
}) {
  if (!canEdit) return null;
  if (state === "saving") return <span className="text-neutral-400">Saving…</span>;
  if (state === "saved") return <span className="text-neutral-400">Saved</span>;
  if (state === "error") {
    return (
      <button onClick={onRetry} className="font-medium text-red-600 underline">
        Save failed — retry
      </button>
    );
  }
  return null;
}

function EditorSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-10 w-2/3" />
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

function CenterMessage({
  text,
  withBack,
}: {
  text: string;
  withBack?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-sm text-neutral-500">
      <p>{text}</p>
      {withBack && (
        <Link href="/" className="text-neutral-900 underline">
          Back to documents
        </Link>
      )}
    </div>
  );
}
