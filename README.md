# Coauthor

A collaborative rich-text document editor: sign up, create or import documents,
format them with a Tiptap editor, autosave, and share with other registered users
as **viewer** or **editor** — with access control enforced on the server.

Built as a spec-driven monorepo (see [`openspec/`](./openspec)) against a 4–6 hour
timebox. The commit history follows a strict per-task / per-phase protocol with
`phase-N-done` tags.

## Stack

| Layer | Choice |
|-------|--------|
| Monorepo | pnpm workspaces + Turborepo |
| Web | Next.js (App Router) + Tailwind |
| API | Hono, mounted at `/api/[[...route]]` (Node runtime), lives in `packages/api` (framework-agnostic, unit-testable via `app.request()`) |
| Contracts | Zod schemas in `packages/shared` — one source of truth for API validation + UI types |
| DB | Drizzle ORM + Neon Postgres (`@neondatabase/serverless`) |
| Auth | Firebase Auth (client SDK) + `firebase-admin` ID-token verification |
| Editor | Tiptap (StarterKit + Underline); content stored as ProseMirror JSON in `jsonb` |
| Data fetching | TanStack Query |
| Tests | Vitest (`pnpm test`) |

Architecture rationale and decisions **D1–D12** are in
[`docs/architecture.md`](./docs/architecture.md).

## Repository layout

```
apps/web            Next.js app (UI + API route mount)
packages/api        Hono app: routers, middleware, access helper (no Next imports)
packages/db         Drizzle schema, Neon client, migrations, seed
packages/shared     Zod schemas + inferred types
packages/config     Shared tsconfig
openspec/           The spec/design/tasks this was built from
docs/               architecture.md, ai-workflow.md
```

## Local setup

Prerequisites: Node ≥ 20, pnpm 11, a Neon Postgres database, and a Firebase project
with **Email/Password** sign-in enabled.

```bash
pnpm install
cp .env.example .env      # then fill in the values (see below)
pnpm db:migrate           # create tables on Neon
pnpm db:seed              # create Alice + Bob + a sample shared document
pnpm dev                  # http://localhost:3000
```

### Environment (`.env`)

| Key | Where to get it |
|-----|-----------------|
| `DATABASE_URL` | Neon → Connection Details → **Pooled** string |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase → Service accounts → generate key → `base64 -i key.json` |
| `NEXT_PUBLIC_FIREBASE_*` (6 keys) | Firebase → Project Settings → General → Web app SDK config |
| `SEED_*` | Seed account emails/password (defaults are fine for the demo) |

## Seeded reviewer accounts

Both use password **`password123`** (documented on the login page too):

| Email | Role in the demo |
|-------|------------------|
| `alice@test.ajaia.dev` | Owns a sample document, shared with Bob (editor) |
| `bob@test.ajaia.dev` | Has that document under "Shared with me" |

## Features

- **Auth** — email/password **login**; **signup** takes name + email only: the backend
  creates the account with a generated password and a **password-reset email** lets the
  user set their own (no password typed on the frontend). *(This amends design D4 — see
  the note in `openspec/design.md`; login stays password-based so seeded accounts work.)*
- **Documents** — create, rich-text edit (bold/italic/underline, H1/H2, bullet & numbered
  lists), inline rename, debounced autosave (`Saving… / Saved / Save failed — retry`).
- **Import** — upload `.txt` or `.md` (≤ 1 MB) → a new editable document. Markdown headings,
  lists, and bold/italic are preserved. Other types / oversize are rejected with a clear 400.
- **Sharing** — share by picking from a **search dropdown of registered users** (viewer or
  editor); collaborator list with revoke; the dashboard shows who each owned doc is shared
  with. Access is enforced server-side: owner = full, editor = read+write, viewer = read,
  no access = `404` (doesn't leak existence).
- **Dashboard** — "My documents" / "Shared with me", role badges, relative timestamps,
  skeleton loading, empty states.

## Tests

```bash
pnpm test
```

Runs the Vitest suite in `packages/api`. Centerpiece is the **access-control matrix**
(owner/editor/viewer/stranger × read/write/delete/share), plus input-validation and
import tests — 24 tests. The suite injects a test auth bypass and uses isolated,
self-cleaning fixtures against the database in `TEST_DATABASE_URL` (falls back to
`DATABASE_URL`).

## Deployment

Deferred in this session; steps are in [`DEPLOY.md`](./DEPLOY.md) (Vercel + the same
Neon database).

## Scope cuts (deliberate)

Real-time collaborative editing (OT/CRDT, live cursors), `.docx` import, comments,
version history, export, folders/search, and password-reset UX beyond Firebase defaults
are **out of scope** — see `openspec/design.md` § Non-Goals.
