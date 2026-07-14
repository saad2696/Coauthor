import { documentShares, users } from "@coauthor/db";
import { createShareSchema } from "@coauthor/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { getDocumentAccess } from "../lib/access";
import { badRequest, forbidden, notFound, userNotFound } from "../lib/errors";
import { zv } from "../lib/validator";
import type { AppDeps, AppEnv } from "../types";

const idParamSchema = z.object({ id: z.string().uuid("Invalid document id") });

/**
 * Share management (design §6). All endpoints are owner-only:
 * no access → 404 (D7), non-owner → 403.
 */
export function shareRoutes(deps: AppDeps) {
  const { db } = deps;
  const app = new Hono<AppEnv>();

  // Owner-only guard for every /documents/:id/shares route.
  async function requireOwner(docId: string, uid: string) {
    const { access } = await getDocumentAccess(db, docId, uid);
    if (!access) throw notFound("Document not found");
    if (access !== "owner") throw forbidden("Only the owner can manage sharing");
  }

  // GET collaborators (with emails + roles).
  app.get("/", zv("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await requireOwner(id, c.get("user").uid);

    const rows = await db
      .select({
        userId: documentShares.userId,
        email: users.email,
        role: documentShares.role,
      })
      .from(documentShares)
      .innerJoin(users, eq(users.id, documentShares.userId))
      .where(eq(documentShares.documentId, id));

    return c.json({ collaborators: rows });
  });

  // POST share by email (idempotent upsert; 404 USER_NOT_FOUND if unregistered).
  app.post(
    "/",
    zv("param", idParamSchema),
    zv("json", createShareSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const uid = c.get("user").uid;
      const { email, role } = c.req.valid("json");
      await requireOwner(id, uid);

      const [target] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!target) {
        throw userNotFound(
          "No registered user with that email. Only registered users can be shared with.",
        );
      }
      if (target.id === uid) {
        throw badRequest("You already own this document.");
      }

      await db
        .insert(documentShares)
        .values({ documentId: id, userId: target.id, role })
        .onConflictDoUpdate({
          target: [documentShares.documentId, documentShares.userId],
          set: { role },
        });

      return c.json(
        { collaborator: { userId: target.id, email: target.email, role } },
        201,
      );
    },
  );

  // DELETE revoke a collaborator.
  app.delete(
    "/:userId",
    zv("param", idParamSchema.extend({ userId: z.string().min(1) })),
    async (c) => {
      const { id, userId } = c.req.valid("param");
      await requireOwner(id, c.get("user").uid);

      await db
        .delete(documentShares)
        .where(
          and(
            eq(documentShares.documentId, id),
            eq(documentShares.userId, userId),
          ),
        );

      return c.body(null, 204);
    },
  );

  return app;
}
