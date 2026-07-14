# AI Workflow Notes

Running log of how AI (Claude Code) was used during the build, captured per phase
as required by the Execution Protocol. Records what AI generated, what was
rejected/rewritten, and how correctness was verified.

## Phase 0 — Scaffold & Tooling

- **Generated:** the full pnpm + Turborepo monorepo skeleton (root `package.json`,
  `pnpm-workspace.yaml`, `turbo.json`), the Next.js App Router app under `apps/web`,
  and shared strict tsconfig in `packages/config`. Verified by `pnpm build` (Next
  build green) and a cross-package import of a placeholder Zod schema from
  `@coauthor/shared`.
- **Rejected/rewrote:** did **not** use `create-next-app` (interactive, fights the
  monorepo layout) — scaffolded `apps/web` by hand instead. Chose Tailwind v3 over
  v4 to avoid the newer PostCSS setup churn inside the timebox.
- **Protocol correction the AI caught:** task 0.6 is named "Initial commit", but the
  Execution Protocol demands a commit after *every* task from 0.1. Resolved by
  `git init` up front and committing per task; 0.6 became "create remote + push".
- **Human-in-the-loop:** provisioning Neon + Firebase and enabling Email/Password is
  credential-gated — paused and requested exact values rather than inventing env.
  Vercel connection deliberately deferred to Phase 8.

## Phase 1 — Database Layer

- **Generated:** Drizzle schema for `users` / `documents` / `document_shares`
  (design §5), the Neon serverless HTTP client, migration runner, and an idempotent
  seed script (Firebase Admin user creation + Postgres mirror + sample shared doc).
- **Design-fidelity fix:** the first generated schema relied on Drizzle's TS-only
  `text` enum for `role`, which emits **no** DB `CHECK` constraint — but design §5
  specifies `CHECK (role IN ('viewer','editor'))`. Added an explicit `check()` so the
  generated SQL matches the design exactly.
- **Verified:** `drizzle-kit generate` → reviewed SQL (3 tables, FKs, cascade on
  shares, indexes, role CHECK); `db:migrate` then confirmed tables via
  `information_schema`; `db:seed` run twice → row counts stayed 2/1/1 (idempotent).

## Phase 2 — API Skeleton & Auth

- **Generated:** framework-agnostic Hono app factory `createApp(deps)` (zero Next.js
  imports, so unit-testable via `app.request()`), Firebase-admin token verifier,
  auth middleware, `POST /auth/sync` upsert, uniform error envelope + global
  `onError`, and a `zValidator` wrapper that funnels Zod failures into the same
  envelope.
- **Design choice refined (not changed):** rather than the `TEST_AUTH_BYPASS`
  env-sniffing middleware from design §9, the `TokenVerifier` is **injected** via
  `createApp(deps)`. Same outcome (tests bypass Firebase) but cleaner and more
  explicit; the env flag remains documented in `.env.example`. D4 (Firebase Admin
  verification) is unchanged.
- **Build bug the AI caught + fixed:** `next build` failed collecting page data
  because the API route created the DB client / verifier at module load. Made app
  construction lazy (first request) and loaded the repo-root `.env` from
  `next.config.mjs`, since Next only reads env from the app dir.
- **Verified:** `app.request()` smoke (health 200, no-token 401, injected-token sync
  200 upsert) + live `next dev` curl (health 200, no-token 401, bad-token 401 — real
  Firebase rejection). Valid-token curl deferred to Phase 4 (needs client apiKey).

## Phase 3 — Document CRUD

- **Generated:** shared Zod schemas (`createDocument`, `updateDocument`, permissive
  `tiptapDoc`, `createShare`), the `getDocumentAccess()` choke point (D6/D7), and the
  full document router (list/create/read/update/delete) with access enforcement.
- **Access model kept in one place:** every `:id` route resolves through
  `getDocumentAccess()` and maps `null → 404` (D7, don't leak existence),
  insufficient role for a write → 403. The helper returns the document alongside the
  access level so handlers don't refetch.
- **Verified with a throwaway matrix harness** (self-contained fixtures, torn down
  after): 14/14 assertions — stranger read 404, viewer/editor/owner read 200,
  stranger write 404, viewer write 403, editor+owner write 200, bad content 400,
  list 200, create 201, non-owner delete 403, stranger delete 404. This is a preview
  of the Phase 8 Vitest centerpiece; the scratch script was not committed.
- **Caught a routing gotcha:** Hono mounts a child `/` at the parent prefix with no
  trailing slash, so `/api/documents/` 404s — the frontend must call
  `/api/documents`. Noted for the Phase 4 API client.
