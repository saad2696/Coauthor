"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Underline as UnderlineIcon,
} from "lucide-react";

/** Formatting toolbar: B / I / U / H1 / H2 / bullet / ordered with active states. */
export function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="sticky top-14 z-20 flex flex-wrap items-center gap-1 rounded-xl border border-neutral-200 bg-white/90 p-1.5 shadow-sm backdrop-blur">
      <Btn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={16} />
      </Btn>
      <Btn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={16} />
      </Btn>
      <Btn label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon size={16} />
      </Btn>

      <Divider />

      <Btn label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 size={16} />
      </Btn>
      <Btn label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={16} />
      </Btn>

      <Divider />

      <Btn label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={16} />
      </Btn>
      <Btn label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={16} />
      </Btn>
    </div>
  );
}

function Btn({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        active
          ? "bg-neutral-900 text-white"
          : "text-neutral-600 hover:bg-neutral-100"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-neutral-200" />;
}
