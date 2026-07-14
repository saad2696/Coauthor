"use client";

import type { TiptapDoc } from "@coauthor/shared";
import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";

import { Toolbar } from "./toolbar";

interface TiptapEditorProps {
  initialContent: TiptapDoc;
  editable: boolean;
  onChange?: (content: TiptapDoc) => void;
}

export function TiptapEditor({
  initialContent,
  editable,
  onChange,
}: TiptapEditorProps) {
  const editor = useEditor({
    // Rendered client-only to avoid SSR hydration mismatch (risk R3).
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Underline,
    ],
    content: initialContent as JSONContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral max-w-none min-h-[60vh] focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as TiptapDoc);
    },
  });

  // Keep editability in sync if the resolved access changes.
  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) {
    return <div className="min-h-[60vh] text-sm text-neutral-400">Loading editor…</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
