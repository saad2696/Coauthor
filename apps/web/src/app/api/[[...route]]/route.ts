import { createApp, createFirebaseVerifier, type AppType } from "@coauthor/api";
import { getDb } from "@coauthor/db";
import { handle } from "hono/vercel";

// Firebase Admin + Neon serverless driver require the Node.js runtime (risk R1).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Build the app lazily on first request so `next build` (page-data collection)
// does not evaluate env-dependent initializers at import time.
let app: AppType | undefined;
function getApp(): AppType {
  if (!app) {
    app = createApp({
      db: getDb(),
      verifyToken: createFirebaseVerifier(),
    });
  }
  return app;
}

const dispatch = (req: Request) => handle(getApp())(req);

export const GET = dispatch;
export const POST = dispatch;
export const PATCH = dispatch;
export const PUT = dispatch;
export const DELETE = dispatch;
