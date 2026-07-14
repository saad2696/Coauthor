import { z } from "zod";

export const shareRoleSchema = z.enum(["viewer", "editor"]);

/** Share grant by email (spec: Share by Email). Role defaults to editor. */
export const createShareSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  role: shareRoleSchema.default("editor"),
});

export type ShareRole = z.infer<typeof shareRoleSchema>;
export type CreateShareInput = z.infer<typeof createShareSchema>;
