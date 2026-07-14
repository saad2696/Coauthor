import { z } from "zod";

/** Simple health payload (used by the landing page / deploy smoke). */
export const healthSchema = z.object({
  ok: z.literal(true),
});
export type Health = z.infer<typeof healthSchema>;

export * from "./schemas/auth";
export * from "./schemas/document";
export * from "./schemas/share";
