# Architecture Note — Coauthor

A one-page distillation of the design. Full rationale lives in
[`openspec/design.md`](../openspec/design.md).

## Overview

One deployable Next.js app. The API is a **Hono** app mounted on a single App Router
catch-all (`/api/[[...route]]`, Node runtime) — no CORS, no second host — but it lives
in `packages/api` with **zero Next.js imports**, so it's unit-testable via
`app.request()` and portable. `packages/shared` holds Zod schemas imported by both the
Hono validators and the frontend, so the request/response contract can't drift.

```
apps/web        Next.js (App Router, Tailwind, Tiptap) + API route mount
packages/api    Hono routers, auth middleware, getDocumentAccess() choke point
packages/db     Drizzle schema, Neon client, migrations, seed
packages/shared Zod schemas + inferred types
```

## Data model (Postgres)

- `users (id = Firebase UID, email unique, display_name, created_at)`
- `documents (id uuid, owner_id → users, title, content jsonb, created_at, updated_at)`
  — index `(owner_id, updated_at desc)`
- `document_shares (id, document_id → documents ON DELETE CASCADE, user_id → users,
  role ∈ {viewer, editor}, unique(document_id, user_id))` — index `(user_id)`

Content is Tiptap/ProseMirror JSON in `jsonb` → lossless round-trip, no HTML
sanitization on the write path.

## Access control (the core)

A single choke point, `getDocumentAccess(db, docId, userId) → owner | editor | viewer | null`,
resolves owner → shares lookup. Every document/share route maps:
`null → 404` (not 403 — don't leak existence), insufficient role for a write → 403.
Owner = full, editor = read + write content/title, viewer = read-only. This is the
centerpiece of the Vitest suite.

## API surface (all under `/api`)

`POST /auth/register` (public), `POST /auth/sync`, `GET/POST /documents`,
`GET/PATCH/DELETE /documents/:id`, `GET/POST/DELETE /documents/:id/shares[/:userId]`,
`GET /users/search`, `POST /import`. Uniform error envelope:
`{ error: { code, message, details? } }` via a global `onError`; all inputs validated
with Zod through `@hono/zod-validator`.

## Key decisions (D1–D12)

| # | Decision | Choice | Why |
|---|----------|--------|-----|
| D1 | Editor | Tiptap (StarterKit + Underline) | Ships required marks fast; clean JSON persistence |
| D2 | Content storage | Tiptap JSON in `jsonb` | Lossless, queryable, no HTML sanitization |
| D3 | ORM | Drizzle + Neon serverless (HTTP) | Serverless-friendly, schema-as-code, thin |
| D4 | Auth | Firebase Auth + admin token verify in middleware | Free, offloads credential handling *(see amendment)* |
| D5 | Users table | Mirror Firebase users into Postgres | Shares need FK integrity + email→user lookup in SQL |
| D6 | Access model | `owner_id` + `document_shares(role)` | Two roles at near-zero cost; one enforcement helper |
| D7 | Unknown-doc | `404` (not 403) | Doesn't leak existence |
| D8 | Save model | Debounced autosave (800 ms), last-write-wins | Honest + correct for single-writer; real-time is a non-goal |
| D9 | State/data | TanStack Query for lists/metadata; Tiptap holds editor state | Query invalidation makes dashboard/share trivial |
| D10 | Import | Server parse: `.md` → marked → `generateJSON` → jsonb; `.txt` → paragraphs | Trust boundary on server, one validation path |
| D11 | Tests | Vitest against the Hono app via `app.request()` | Highest value/min: the access matrix is the riskiest logic |
| D12 | Styling | Tailwind + hand-rolled components | Clean, coherent, fast to build |

### D4 amendment (owner-approved, this session)

Signup no longer takes a password on the frontend: the form collects **name + email**,
`POST /api/auth/register` creates the Firebase account (Admin SDK) with a generated
password + display name and mirrors the `users` row, then Firebase's built-in
**password-reset email** lets the user set their own password. **Login stays
email/password**, so token verification and user-mirroring — the substance of D4 — are
unchanged, and seeded reviewer accounts still work.

## Notable risks handled

Firebase Admin + Neon driver run on the **Node runtime** (`runtime = 'nodejs'`); the
Tiptap editor is **client-only** (`immediatelyRender: false`) with content set on
editor-ready to avoid a blank-editor race; autosave **flushes on tab-hide/unload** so
edits aren't lost mid-debounce.
