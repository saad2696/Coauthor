import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * Uniform error envelope per design §6:
 *   { error: { code, message, details? } }
 */
export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "USER_NOT_FOUND"
  | "BAD_REQUEST"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: ContentfulStatusCode,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthorized = (message = "Authentication required") =>
  new AppError("UNAUTHORIZED", message, 401);

export const forbidden = (message = "You do not have access to this resource") =>
  new AppError("FORBIDDEN", message, 403);

export const notFound = (message = "Not found") =>
  new AppError("NOT_FOUND", message, 404);

export const badRequest = (message: string, details?: unknown) =>
  new AppError("BAD_REQUEST", message, 400, details);

export const userNotFound = (
  message = "No registered user with that email",
) => new AppError("USER_NOT_FOUND", message, 404);

export function errorBody(
  code: ErrorCode,
  message: string,
  details?: unknown,
) {
  return { error: { code, message, ...(details ? { details } : {}) } };
}
