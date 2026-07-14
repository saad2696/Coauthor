import { documentShares, documents, users } from "@coauthor/db";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { as, jsonHeaders, makeTestApp } from "./helpers";

const { app, db } = makeTestApp();

const OWNER = "t8mx-owner";
const EDITOR = "t8mx-editor";
const VIEWER = "t8mx-viewer";
const TARGET = "t8mx-target";
const STRANGER = "t8mx-stranger";
const DOC = "00000000-0000-4000-8000-0000000008aa";

beforeAll(async () => {
  await db
    .insert(users)
    .values([
      { id: OWNER, email: `${OWNER}@t8.local` },
      { id: EDITOR, email: `${EDITOR}@t8.local` },
      { id: VIEWER, email: `${VIEWER}@t8.local` },
      { id: TARGET, email: `${TARGET}@t8.local` },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  for (const u of [OWNER, EDITOR, VIEWER, TARGET]) {
    await db.delete(users).where(eq(users.id, u));
  }
});

beforeEach(async () => {
  await db
    .insert(documents)
    .values({ id: DOC, ownerId: OWNER, title: "Matrix Doc" })
    .onConflictDoUpdate({ target: documents.id, set: { ownerId: OWNER } });
  await db
    .insert(documentShares)
    .values([
      { documentId: DOC, userId: EDITOR, role: "editor" },
      { documentId: DOC, userId: VIEWER, role: "viewer" },
    ])
    .onConflictDoNothing();
});

afterEach(async () => {
  await db.delete(documents).where(eq(documents.id, DOC)); // cascades shares
});

function get(uid: string) {
  return app.request(`/api/documents/${DOC}`, { headers: as(uid) });
}
function patch(uid: string, body: unknown) {
  return app.request(`/api/documents/${DOC}`, {
    method: "PATCH",
    headers: jsonHeaders(uid),
    body: JSON.stringify(body),
  });
}
function del(uid: string) {
  return app.request(`/api/documents/${DOC}`, { method: "DELETE", headers: as(uid) });
}
function share(uid: string, email: string, role = "editor") {
  return app.request(`/api/documents/${DOC}/shares`, {
    method: "POST",
    headers: jsonHeaders(uid),
    body: JSON.stringify({ email, role }),
  });
}

describe("access-control matrix (D6/D7)", () => {
  describe("read (GET /documents/:id)", () => {
    it("stranger → 404 (no existence leak)", async () => {
      expect((await get(STRANGER)).status).toBe(404);
    });
    it("viewer → 200", async () => {
      expect((await get(VIEWER)).status).toBe(200);
    });
    it("editor → 200", async () => {
      expect((await get(EDITOR)).status).toBe(200);
    });
    it("owner → 200", async () => {
      expect((await get(OWNER)).status).toBe(200);
    });
  });

  describe("write (PATCH /documents/:id)", () => {
    it("stranger → 404", async () => {
      expect((await patch(STRANGER, { title: "x" })).status).toBe(404);
    });
    it("viewer → 403", async () => {
      expect((await patch(VIEWER, { title: "x" })).status).toBe(403);
    });
    it("editor → 200", async () => {
      expect((await patch(EDITOR, { title: "edited" })).status).toBe(200);
    });
    it("owner → 200", async () => {
      expect((await patch(OWNER, { title: "owned" })).status).toBe(200);
    });
  });

  describe("delete (DELETE /documents/:id)", () => {
    it("editor (non-owner) → 403", async () => {
      expect((await del(EDITOR)).status).toBe(403);
    });
    it("viewer → 403", async () => {
      expect((await del(VIEWER)).status).toBe(403);
    });
    it("stranger → 404", async () => {
      expect((await del(STRANGER)).status).toBe(404);
    });
    it("owner → 204", async () => {
      expect((await del(OWNER)).status).toBe(204);
    });
  });

  describe("share (POST /documents/:id/shares)", () => {
    it("editor (non-owner) → 403", async () => {
      expect((await share(EDITOR, `${TARGET}@t8.local`)).status).toBe(403);
    });
    it("stranger → 404", async () => {
      expect((await share(STRANGER, `${TARGET}@t8.local`)).status).toBe(404);
    });
    it("owner + registered target → 201", async () => {
      expect((await share(OWNER, `${TARGET}@t8.local`)).status).toBe(201);
    });
    it("owner + unknown email → 404 USER_NOT_FOUND", async () => {
      const res = await share(OWNER, "nobody-xyz@t8.local");
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe("USER_NOT_FOUND");
    });
  });

  it("unauthenticated request → 401", async () => {
    const res = await app.request(`/api/documents/${DOC}`);
    expect(res.status).toBe(401);
  });
});
