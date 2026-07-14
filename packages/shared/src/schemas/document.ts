import { z } from "zod";

/** Title: 1–200 chars after trimming (spec: Document Rename). */
export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title must be at least 1 character")
  .max(200, "Title must be at most 200 characters");

/**
 * Permissive-but-typed shape check on Tiptap/ProseMirror JSON (design §8/D2).
 * Rejects obviously wrong shapes (e.g. content sent as a string) while not
 * hard-coding the full node schema. Unknown keys pass through.
 */
export const tiptapNodeSchema: z.ZodType<TiptapNode> = z.lazy(() =>
  z
    .object({
      type: z.string(),
      attrs: z.record(z.unknown()).optional(),
      content: z.array(tiptapNodeSchema).optional(),
      marks: z
        .array(
          z
            .object({
              type: z.string(),
              attrs: z.record(z.unknown()).optional(),
            })
            .passthrough(),
        )
        .optional(),
      text: z.string().optional(),
    })
    .passthrough(),
);

export const tiptapDocSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(tiptapNodeSchema).optional(),
  })
  .passthrough();

export const createDocumentSchema = z.object({
  title: titleSchema.optional(),
});

export const updateDocumentSchema = z
  .object({
    title: titleSchema.optional(),
    content: tiptapDocSchema.optional(),
  })
  .refine((d) => d.title !== undefined || d.content !== undefined, {
    message: "Provide at least one of title or content",
  });

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
  [key: string]: unknown;
}

export type TiptapDoc = z.infer<typeof tiptapDocSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
