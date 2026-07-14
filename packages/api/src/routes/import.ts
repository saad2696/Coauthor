import { documents } from "@coauthor/db";
import { Hono } from "hono";

import { badRequest } from "../lib/errors";
import { convertUpload } from "../lib/import";
import type { AppDeps, AppEnv } from "../types";

/**
 * POST /import — multipart upload of a .txt/.md file (≤ 1 MB) → new document
 * owned by the caller (design §6, D10). Returns { id }.
 */
export function importRoutes(deps: AppDeps) {
  const app = new Hono<AppEnv>();

  app.post("/", async (c) => {
    const uid = c.get("user").uid;

    const body = await c.req.parseBody();
    const file = body["file"];
    if (!(file instanceof File)) {
      throw badRequest("No file uploaded. Attach a .txt or .md file.");
    }

    const { title, content } = await convertUpload(file);

    const [doc] = await deps.db
      .insert(documents)
      .values({ ownerId: uid, title, content })
      .returning({ id: documents.id });

    return c.json({ id: doc!.id }, 201);
  });

  return app;
}
