import { config } from "dotenv";
import { sql } from "drizzle-orm";
import {
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import { createDb } from "./client";
import { documentShares, documents, users } from "./schema";

// Load repo-root .env.
config({ path: "../../.env" });

/**
 * Seeds the demo environment (task 1.3):
 *  - Alice + Bob as Firebase users (Admin SDK) and mirrored users rows
 *  - one sample document owned by Alice, shared to Bob as editor
 * Idempotent: re-running updates in place rather than duplicating.
 */

const SAMPLE_DOC_ID = "00000000-0000-4000-8000-000000000001";

const SAMPLE_CONTENT = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Welcome to Coauthor" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "This sample document is owned by " },
        { type: "text", marks: [{ type: "bold" }], text: "Alice" },
        { type: "text", text: " and shared with Bob as an editor." },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Try editing this list." }],
            },
          ],
        },
      ],
    },
  ],
};

function initAdmin() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!b64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
  }
  const serviceAccount = JSON.parse(
    Buffer.from(b64, "base64").toString("utf8"),
  ) as ServiceAccount;
  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getAuth();
}

async function ensureFirebaseUser(
  auth: ReturnType<typeof getAuth>,
  email: string,
  password: string,
  displayName: string,
): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(email);
    // Reset the password so the documented demo credentials always work.
    await auth.updateUser(existing.uid, { password, displayName });
    return existing.uid;
  } catch {
    const created = await auth.createUser({ email, password, displayName });
    return created.uid;
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const aliceEmail = process.env.SEED_ALICE_EMAIL ?? "alice@test.ajaia.dev";
  const bobEmail = process.env.SEED_BOB_EMAIL ?? "bob@test.ajaia.dev";
  const password = process.env.SEED_PASSWORD ?? "password123";

  const auth = initAdmin();
  const db = createDb(url);

  console.log("Creating Firebase users…");
  const aliceUid = await ensureFirebaseUser(auth, aliceEmail, password, "Alice");
  const bobUid = await ensureFirebaseUser(auth, bobEmail, password, "Bob");

  console.log("Mirroring users into Postgres…");
  await db
    .insert(users)
    .values([
      { id: aliceUid, email: aliceEmail, displayName: "Alice" },
      { id: bobUid, email: bobEmail, displayName: "Bob" },
    ])
    .onConflictDoUpdate({
      target: users.id,
      set: { email: sql`excluded.email`, displayName: sql`excluded.display_name` },
    });

  console.log("Creating sample document owned by Alice…");
  await db
    .insert(documents)
    .values({
      id: SAMPLE_DOC_ID,
      ownerId: aliceUid,
      title: "Welcome to Coauthor",
      content: SAMPLE_CONTENT,
    })
    .onConflictDoUpdate({
      target: documents.id,
      set: { content: SAMPLE_CONTENT, ownerId: aliceUid },
    });

  console.log("Sharing sample document with Bob as editor…");
  await db
    .insert(documentShares)
    .values({ documentId: SAMPLE_DOC_ID, userId: bobUid, role: "editor" })
    .onConflictDoUpdate({
      target: [documentShares.documentId, documentShares.userId],
      set: { role: "editor" },
    });

  console.log("\nSeed complete:");
  console.log(`  Alice: ${aliceEmail} / ${password} (uid ${aliceUid})`);
  console.log(`  Bob:   ${bobEmail} / ${password} (uid ${bobUid})`);
  console.log(`  Sample doc ${SAMPLE_DOC_ID} owned by Alice, shared to Bob.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
