import { type Database, type Document, documentShares, documents } from "@coauthor/db";
import { and, eq } from "drizzle-orm";

export type Access = "owner" | "editor" | "viewer" | null;

export interface DocumentAccess {
  /** The document row, or null if it does not exist. */
  document: Document | null;
  /** The caller's access level, or null if none (→ maps to 404). */
  access: Access;
}

/**
 * Single choke point for document authorization (design §6, D6/D7).
 * Resolves the caller's access: owner → shares lookup → null. Returns the
 * document alongside so routes avoid a second fetch.
 *
 * Callers map: access null → 404 (not 403, D7 — don't leak existence);
 * insufficient role for a write → 403.
 */
export async function getDocumentAccess(
  db: Database,
  docId: string,
  userId: string,
): Promise<DocumentAccess> {
  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, docId))
    .limit(1);

  if (!document) {
    return { document: null, access: null };
  }

  if (document.ownerId === userId) {
    return { document, access: "owner" };
  }

  const [share] = await db
    .select({ role: documentShares.role })
    .from(documentShares)
    .where(
      and(
        eq(documentShares.documentId, docId),
        eq(documentShares.userId, userId),
      ),
    )
    .limit(1);

  return { document, access: share ? share.role : null };
}

/** True when the access level permits editing content/title (owner or editor). */
export function canEdit(access: Access): boolean {
  return access === "owner" || access === "editor";
}
