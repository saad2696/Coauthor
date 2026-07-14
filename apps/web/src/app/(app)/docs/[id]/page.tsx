"use client";

import type { TiptapDoc } from "@coauthor/shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { useAutosave } from "@/lib/use-autosave";
import { TiptapEditor } from "@/components/editor/tiptap-editor";

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["document", id],
    queryFn: () => api.getDocument(id),
    retry: false,
  });

  if (isLoading) {
    return <CenterMessage text="Loading document…" />;
  }
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
      isViewer={data.access === "viewer"}
    />
  );
}

function DocumentEditor({
  docId,
  initialTitle,
  initialContent,
  canEdit,
  isViewer,
}: {
  docId: string;
  initialTitle: string;
  initialContent: TiptapDoc;
  canEdit: boolean;
  isViewer: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [titleError, setTitleError] = useState<string | null>(null);

  const saveContent = useCallback(
    (content: TiptapDoc) => api.updateDocument(docId, { content }),
    [docId],
  );
  const { state, schedule, retry } = useAutosave(saveContent);

  const commitTitle = useCallback(async () => {
    const trimmed = title.trim();
    if (trimmed === initialTitle || trimmed === "") {
      if (trimmed === "") setTitle(initialTitle);
      return;
    }
    try {
      await api.updateDocument(docId, { title: trimmed });
      setTitleError(null);
    } catch (err) {
      setTitle(initialTitle);
      setTitleError(
        err instanceof ApiError ? err.message : "Failed to rename document.",
      );
    }
  }, [title, initialTitle, docId]);

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
          <SaveIndicator state={state} canEdit={canEdit} onRetry={retry} />
        </div>
      </div>

      <input
        value={title}
        disabled={!canEdit}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className="w-full border-none bg-transparent text-3xl font-semibold tracking-tight outline-none disabled:text-neutral-800"
        placeholder="Untitled document"
      />
      {titleError && <p className="text-sm text-red-600">{titleError}</p>}

      <TiptapEditor
        initialContent={initialContent}
        editable={canEdit}
        onChange={canEdit ? schedule : undefined}
      />
    </div>
  );
}

function SaveIndicator({
  state,
  canEdit,
  onRetry,
}: {
  state: ReturnType<typeof useAutosave>["state"];
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
