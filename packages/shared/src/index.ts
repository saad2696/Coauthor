import { z } from "zod";

/**
 * Placeholder schema to verify cross-package imports build (task 0.3).
 * Real domain schemas (createDocumentSchema, updateDocumentSchema,
 * tiptapDocSchema, createShareSchema) are added in Phase 3 / Phase 7.
 */
export const healthSchema = z.object({
  ok: z.literal(true),
});

export type Health = z.infer<typeof healthSchema>;
