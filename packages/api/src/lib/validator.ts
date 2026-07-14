import { zValidator as baseZValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodSchema } from "zod";

import { AppError } from "./errors";

/**
 * Wrapper around @hono/zod-validator that funnels validation failures into the
 * uniform error envelope (VALIDATION, 400) with the failing field paths in
 * `details` (design §8). Used across all routes with shared schemas.
 */
export function zv<T extends ZodSchema, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) {
  return baseZValidator(target, schema, (result) => {
    if (!result.success) {
      throw new AppError(
        "VALIDATION",
        "Request validation failed",
        400,
        result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      );
    }
  });
}
