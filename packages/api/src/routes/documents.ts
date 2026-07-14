import { documentShares, documents, users } from "@coauthor/db";
import {
  createDocumentSchema,
  updateDocumentSchema,
} from "@coauthor/shared";
import { desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { canEdit, getDocumentAccess } from "../lib/access";
import { forbidden, notFound } from "../lib/errors";
import { zv } from "../lib/validator";
import type { AppDeps, AppEnv } from "../types";

const idParamSchema = z.object({ id: z.string().uuid("Invalid document id") });

/**
 * Document CRUD (design §6). Every :id route resolves access through the single
 * getDocumentAccess() choke point and maps: no access → 404 (D7); insufficient
 * role for a write → 403.
 */
export function documentRoutes(deps: AppDeps) {
  const { db } = deps;
  const app = new Hono<AppEnv>();

  // GET /documents → { owned, shared } ordered by updated_at desc.
  app.get("/", async (c) => {
    const uid = c.get("user").uid;

    const ownedDocs = await db
      .select()
      .from(documents)
      .where(eq(documents.ownerId, uid))
      .orderBy(desc(documents.updatedAt));

    // Collaborators per owned doc, so the dashboard can show who each is shared with.
    const ownedIds = ownedDocs.map((d) => d.id);
    const shareRows = ownedIds.length
      ? await db
          .select({
            documentId: documentShares.documentId,
            userId: documentShares.userId,
            email: users.email,
            displayName: users.displayName,
            role: documentShares.role,
          })
          .from(documentShares)
          .innerJoin(users, eq(users.id, documentShares.userId))
          .where(inArray(documentShares.documentId, ownedIds))
      : [];

    const collaboratorsByDoc = new Map<string, typeof shareRows>();
    for (const row of shareRows) {
      const list = collaboratorsByDoc.get(row.documentId) ?? [];
      list.push(row);
      collaboratorsByDoc.set(row.documentId, list);
    }

    const owned = ownedDocs.map((d) => ({
      ...d,
      collaborators: (collaboratorsByDoc.get(d.id) ?? []).map((r) => ({
        userId: r.userId,
        email: r.email,
        displayName: r.displayName,
        role: r.role,
      })),
    }));

    const sharedRows = await db
      .select({ doc: documents, role: documentShares.role })
      .from(documentShares)
      .innerJoin(documents, eq(documents.id, documentShares.documentId))
      .where(eq(documentShares.userId, uid))
      .orderBy(desc(documents.updatedAt));

    const shared = sharedRows.map((r) => ({ ...r.doc, role: r.role }));

    return c.json({ owned, shared });
  });

  // POST /documents → create empty doc owned by caller.
  app.post("/", zv("json", createDocumentSchema), async (c) => {
    const uid = c.get("user").uid;
    const { title } = c.req.valid("json");

    const [doc] = await db
      .insert(documents)
      .values({ ownerId: uid, ...(title ? { title } : {}) })
      .returning();

    return c.json({ document: doc }, 201);
  });

  // GET /documents/:id → owner/editor/viewer; no access → 404.
  app.get("/:id", zv("param", idParamSchema), async (c) => {
    const uid = c.get("user").uid;
    const { id } = c.req.valid("param");

    const { document, access } = await getDocumentAccess(db, id, uid);
    if (!access || !document) {
      throw notFound("Document not found");
    }
    return c.json({ document, access });
  });

  // PATCH /documents/:id → owner/editor; viewer → 403; no access → 404.
  app.patch(
    "/:id",
    zv("param", idParamSchema),
    zv("json", updateDocumentSchema),
    async (c) => {
      const uid = c.get("user").uid;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");

      const { access } = await getDocumentAccess(db, id, uid);
      if (!access) {
        throw notFound("Document not found");
      }
      if (!canEdit(access)) {
        throw forbidden("Viewers cannot edit this document");
      }

      const [doc] = await db
        .update(documents)
        .set({
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.content !== undefined ? { content: body.content } : {}),
          updatedAt: new Date(),
        })
        .where(eq(documents.id, id))
        .returning();

      return c.json({ document: doc });
    },
  );

  // DELETE /documents/:id → owner only; non-owner → 403; no access → 404.
  app.delete("/:id", zv("param", idParamSchema), async (c) => {
    const uid = c.get("user").uid;
    const { id } = c.req.valid("param");

    const { access } = await getDocumentAccess(db, id, uid);
    if (!access) {
      throw notFound("Document not found");
    }
    if (access !== "owner") {
      throw forbidden("Only the owner can delete this document");
    }

    // Shares cascade via ON DELETE CASCADE.
    await db.delete(documents).where(eq(documents.id, id));
    return c.body(null, 204);
  });

  return app;
}
