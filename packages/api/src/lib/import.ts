import Underline from "@tiptap/extension-underline";
import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import { marked } from "marked";

import { badRequest } from "./errors";

export const MAX_IMPORT_BYTES = 1024 * 1024; // 1 MB
export const SUPPORTED_EXTENSIONS = [".txt", ".md"] as const;

const EDITOR_EXTENSIONS = [StarterKit, Underline];

/** Strips directory + extension and clamps to a valid title (1–200 chars). */
export function titleFromFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const withoutExt = base.replace(/\.(txt|md)$/i, "").trim();
  const title = withoutExt.slice(0, 200);
  return title.length > 0 ? title : "Untitled document";
}

/** Plain text → Tiptap doc: each line becomes a paragraph (empty lines kept). */
export function textToTiptap(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const content = lines.map((line) =>
    line.length > 0
      ? { type: "paragraph", content: [{ type: "text", text: line }] }
      : { type: "paragraph" },
  );
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

/** Markdown → HTML (marked) → Tiptap JSON (generateJSON), per D10. */
export async function markdownToTiptap(md: string) {
  const html = await marked.parse(md, { async: true });
  return generateJSON(html, EDITOR_EXTENSIONS);
}

/**
 * Validates an uploaded file (type + size) and converts it to a Tiptap doc.
 * Throws a 400 AppError with a clear message on unsupported type / oversize.
 */
export async function convertUpload(
  file: File,
): Promise<{ title: string; content: unknown }> {
  const name = file.name ?? "";
  const lower = name.toLowerCase();
  const isMd = lower.endsWith(".md");
  const isTxt = lower.endsWith(".txt");

  if (!isMd && !isTxt) {
    throw badRequest(
      "Unsupported file type. Only .txt and .md files are supported.",
    );
  }
  if (file.size > MAX_IMPORT_BYTES) {
    throw badRequest("File is too large. The maximum size is 1 MB.");
  }

  const text = await file.text();
  const content = isMd ? await markdownToTiptap(text) : textToTiptap(text);
  return { title: titleFromFilename(name), content };
}
