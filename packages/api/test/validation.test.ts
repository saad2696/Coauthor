import { documents, users } from "@coauthor/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { as, jsonHeaders, makeTestApp } from "./helpers";

const { app, db } = makeTestApp();

const USER = "t8val-user";
const DOC = "00000000-0000-4000-8000-0000000008bb";

beforeAll(async () => {
  await db
    .insert(users)
    .values({ id: USER, email: `${USER}@t8.local` })
    .onConflictDoNothing();
  await db
    .insert(documents)
    .values({ id: DOC, ownerId: USER, title: "Validation Doc" })
    .onConflictDoUpdate({ target: documents.id, set: { ownerId: USER } });
});

afterAll(async () => {
  await db.delete(documents).where(eq(documents.ownerId, USER));
  await db.delete(users).where(eq(users.id, USER));
});

function patch(body: unknown) {
  return app.request(`/api/documents/${DOC}`, {
    method: "PATCH",
    headers: jsonHeaders(USER),
    body: JSON.stringify(body),
  });
}

function upload(filename: string, content: string, type = "text/plain") {
  const form = new FormData();
  form.append("file", new File([content], filename, { type }));
  return app.request("/api/import", { method: "POST", headers: as(USER), body: form });
}

describe("input validation (Zod, 400 with field paths)", () => {
  it("content sent as a string → 400 at path 'content'", async () => {
    const res = await patch({ content: "not an object" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION");
    expect(JSON.stringify(body.error.details)).toContain("content");
  });

  it("title over 200 chars → 400", async () => {
    const res = await patch({ title: "x".repeat(201) });
    expect(res.status).toBe(400);
  });

  it("empty PATCH body → 400 (must provide title or content)", async () => {
    expect((await patch({})).status).toBe(400);
  });

  it("register with missing name / bad email → 400", async () => {
    const res = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("file import validation", () => {
  it("unsupported .pdf → 400", async () => {
    expect((await upload("x.pdf", "fake", "application/pdf")).status).toBe(400);
  });

  it("oversized file (>1MB) → 400", async () => {
    expect((await upload("big.md", "a".repeat(1024 * 1024 + 10)).then((r) => r)).status).toBe(400);
  });

  it("valid .md → 201 with a heading node", async () => {
    const res = await upload("notes.md", "# Title\n\n- a\n- b\n\n**bold**", "text/markdown");
    expect(res.status).toBe(201);
    const { id } = await res.json();
    const doc = (await (await app.request(`/api/documents/${id}`, { headers: as(USER) })).json()).document;
    expect(doc.title).toBe("notes");
    expect(doc.content.content.some((n: { type: string }) => n.type === "heading")).toBe(true);
  });
});
