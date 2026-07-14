import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Data model per design.md §5. Content is Tiptap/ProseMirror JSON stored in
 * jsonb (D2). Access is owner_id + document_shares(role) (D6).
 */

export const users = pgTable("users", {
  // Firebase UID is the primary key (D5 — mirror Firebase users into Postgres).
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

const EMPTY_DOC = sql`'{"type":"doc","content":[]}'::jsonb`;

export const documents = pgTable(
  "documents",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull().default("Untitled document"),
    content: jsonb("content").notNull().default(EMPTY_DOC),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("documents_owner_updated_idx").on(
      table.ownerId,
      table.updatedAt.desc(),
    ),
  ],
);

export const documentShares = pgTable(
  "document_shares",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role", { enum: ["viewer", "editor"] })
      .notNull()
      .default("editor"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("document_shares_doc_user_unique").on(
      table.documentId,
      table.userId,
    ),
    index("document_shares_user_idx").on(table.userId),
    check("document_shares_role_check", sql`${table.role} IN ('viewer','editor')`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentShare = typeof documentShares.$inferSelect;
export type NewDocumentShare = typeof documentShares.$inferInsert;
export type ShareRole = DocumentShare["role"];
