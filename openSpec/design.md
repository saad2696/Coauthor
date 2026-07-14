# Design: Collaborative Document Editor (Ajaia Take-Home)

> OpenSpec technical design. Records context, decisions, and rationale so implementation
> can proceed without re-litigating choices. Read alongside `spec.md` (what) and `tasks.md` (order).

## 1. Context

- **Timebox:** 4–6 hours of build time. Every decision below optimizes for shipping a coherent, deployed, testable slice — not architectural maximalism.
- **Evaluation signals (from the brief):** product judgment, deliberate scope cuts, full-stack execution, editing quality, working deployment, access logic, AI-native workflow with human judgment.
- **Builder profile:** strongest in TypeScript/React/Next.js; prior monorepo experience with pnpm + Turborepo, TanStack Query, Zod, Hono. The stack intentionally reuses proven patterns to minimize integration risk inside the timebox.

## 2. Goals / Non-Goals

**Goals**
- End-to-end flow: signup → create → format → autosave → import file → share → collaborator sees/edits → persists across sessions.
- Real access control enforced server-side (not just hidden UI).
- One-command local setup; live Vercel deployment; seeded reviewer accounts.

**Non-Goals (explicit scope cuts — say these in the README and video)**
- Real-time collaborative editing (OT/CRDT, presence cursors). Autosave + last-write-wins is the model. *Rationale: real-time sync is the single largest time sink and the brief lists it only as optional stretch.*
- `.docx` import (stretch only, via `mammoth` if time remains). v1 supports `.txt` + `.md`.
- Sharing with unregistered emails / invite flows. Shares resolve against existing users only.
- Comments, version history, export, folders, search, offline.
- Enterprise auth (orgs, SSO, password reset UX beyond Firebase defaults).

## 3. Architecture Overview

```
apps/
  web/                     Next.js 14+ (App Router), Tailwind, Tiptap
    app/
      (auth)/login, signup
      (app)/page.tsx           → dashboard
      (app)/docs/[id]/page.tsx → editor
      api/[[...route]]/route.ts → mounts the Hono app (single catch-all)
packages/
  api/                     Hono app: routers, middleware (framework-agnostic, testable)
  db/                      Drizzle schema, migrations, Neon client, seed script
  shared/                  Zod schemas + inferred TS types (single source of truth)
  config/                  shared tsconfig / eslint
```

- **Monorepo:** pnpm workspaces + Turborepo. Justification: `shared` Zod schemas are imported by both the Hono validators and the frontend forms/TanStack Query hooks — one contract, zero drift. Turborepo gives cached `build/lint/test` pipelines cheaply.
- **API inside Next.js:** Hono mounted on a single App Router catch-all (`/api/[[...route]]`). One deployable unit on Vercel, no CORS, no second host — but the Hono app itself lives in `packages/api` with zero Next.js imports, so it is unit-testable with `app.request()` and portable later.

## 4. Key Decisions

| # | Decision | Choice | Alternatives considered | Rationale |
|---|----------|--------|------------------------|-----------|
| D1 | Editor | **Tiptap** (StarterKit + Underline) | Slate, Lexical, Quill, contentEditable | Ships the exact required marks in minutes; ProseMirror JSON is a clean persistence model; huge docs/ecosystem. Lexical is powerful but slower to wire under a timebox. |
| D2 | Content storage | **Tiptap JSON in `jsonb`** | HTML string, Markdown | Lossless round-trip, queryable, no sanitization ambiguity on write path. HTML rendering of untrusted content avoided entirely. |
| D3 | ORM | **Drizzle** + `@neondatabase/serverless` | Prisma, Kysely, raw SQL | Serverless-friendly (HTTP driver, no connection pool pain on Vercel), schema-as-code migrations, thin and fast. |
| D4 | Auth | **Firebase Auth** (client SDK) + **firebase-admin** ID-token verification in Hono middleware | NextAuth, Clerk, Lucia, roll-your-own | Free, familiar, offloads credential handling; a 20-line middleware verifies `Bearer <idToken>` and upserts the user row. Avoids session/cookie plumbing. |

> **D4 amendment (owner-approved, post-Phase-7):** Signup is now **passwordless email-link** (Firebase `sendSignInLinkToEmail`): the signup form collects **name + email** and emails a magic sign-in link; `/auth/finish` completes sign-in and stores the name (via `/auth/sync` optional `displayName`). **Login remains email/password**, so the seeded reviewer accounts (Alice/Bob) still work instantly. Requires the "Email link (passwordless sign-in)" toggle enabled in Firebase Auth. Token verification / user-mirroring (the core of D4) is unchanged.
| D5 | Users table | Mirror Firebase users into Postgres (`id = firebase uid`) | Query Firebase for user lookups | Shares need FK integrity and email→user lookup inside SQL; mirroring on auth is one upsert. |
| D6 | Access model | `documents.owner_id` + `document_shares(document_id, user_id, role)` with role ∈ {viewer, editor} | Boolean shares, full ACL/RBAC | Two roles demonstrate "beyond basic access" (stretch item) at near-zero extra cost; centralized `getDocumentAccess()` helper keeps enforcement in one place. |
| D7 | Unknown-doc responses | `404` for no-access (not 403) | 403 | Doesn't leak document existence; standard practice; called out in architecture note as deliberate. |
| D8 | Save model | Debounced autosave (800 ms), last-write-wins, full-document PATCH | Real-time sync, operational transforms, field-level patches | Honest, simple, correct for single-writer-at-a-time usage; concurrency is a documented non-goal for the base build. **Superseded by `collab-mode-change.md` (D13–D16) if Phase 10 is executed**: versioned compare-and-set saves + poll-based presence. |
| D9 | State/data fetching | **TanStack Query** for lists + metadata; editor content kept in Tiptap state, synced via mutation | Redux, SWR, server components only | Query invalidation makes dashboard/share dialogs trivial; the editor is inherently client state. |
| D10 | File import | Server-side parse: `.md` → `marked` → HTML → `generateJSON` (Tiptap server util) → jsonb; `.txt` → paragraphs | Client-side parse | Keeps trust boundary on server, one code path for validation + size limit. |
| D11 | Tests | **Vitest** against the Hono app via `app.request()`, Neon branch or local Postgres via env | Playwright E2E | Highest value per minute: the access matrix is the riskiest logic and is pure API. E2E is a stretch. |
| D12 | Styling | Tailwind + a handful of hand-rolled components (button, dialog, toast) or shadcn/ui if scaffolding is fast | Component library heavyweights | Keep UI clean, coherent, and *fast to build*; editing UX quality > visual novelty. |

## 5. Data Model (Drizzle / Postgres)

```sql
users (
  id          text PRIMARY KEY,            -- Firebase UID
  email       text NOT NULL UNIQUE,
  display_name text,
  created_at  timestamptz NOT NULL DEFAULT now()
)

documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    text NOT NULL REFERENCES users(id),
  title       text NOT NULL DEFAULT 'Untitled document',
  content     jsonb NOT NULL DEFAULT '{"type":"doc","content":[]}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
)
-- index: (owner_id, updated_at desc)

document_shares (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES users(id),
  role        text NOT NULL CHECK (role IN ('viewer','editor')) DEFAULT 'editor',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, user_id)
)
-- index: (user_id) for "shared with me"
```

## 6. API Surface (Hono, all under `/api`, all authed)

| Method | Route | Body (Zod) | Access | Notes |
|--------|-------|-----------|--------|-------|
| POST | `/auth/sync` | — | any authed | Upserts user row from verified token (called after login/signup) |
| GET | `/documents` | — | any authed | Returns `{ owned: [...], shared: [...] }` with `role` on shared |
| POST | `/documents` | `{ title? }` | any authed | Creates empty doc |
| GET | `/documents/:id` | — | owner/editor/viewer | 404 if no access |
| PATCH | `/documents/:id` | `{ title?, content? }` | owner/editor | Viewer → 403 |
| DELETE | `/documents/:id` | — | owner | Cascade shares |
| GET | `/documents/:id/shares` | — | owner | Collaborator list w/ emails |
| POST | `/documents/:id/shares` | `{ email, role }` | owner | 404 USER_NOT_FOUND if unregistered; upsert on re-share |
| DELETE | `/documents/:id/shares/:userId` | — | owner | Revoke |
| POST | `/import` | multipart `file` | any authed | `.txt`/`.md` ≤ 1 MB → creates doc, returns `{ id }` |

**Error envelope (uniform):** `{ error: { code: "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "USER_NOT_FOUND" | ..., message, details? } }`

**Auth middleware:** reads `Authorization: Bearer <idToken>` → `firebase-admin.verifyIdToken` → sets `c.var.user = { uid, email }` → 401 otherwise. Admin SDK initialized from `FIREBASE_SERVICE_ACCOUNT_JSON` env (base64).

**Access helper (single choke point):**
```ts
type Access = 'owner' | 'editor' | 'viewer' | null;
async function getDocumentAccess(docId: string, userId: string): Promise<Access>
```
Every document route resolves access through this and maps: `null → 404`, insufficient role → 403.

## 7. Frontend Flows

- **Dashboard `/`:** two sections (My documents / Shared with me), New document button, Import button (file input → `/import` → redirect to editor), relative "updated X ago", role badge on shared docs.
- **Editor `/docs/[id]`:** header = back link, inline title input (rename on blur/Enter), save-state indicator, Share button (owner only); toolbar = B / I / U / H1 / H2 / bullet / ordered with active states; Tiptap content area; read-only mode (`editable: false`, toolbar hidden) for viewers.
- **Share dialog:** email input + role select + current collaborators list with revoke; errors surfaced inline (`USER_NOT_FOUND` → "No registered user with that email").
- **Auth pages:** minimal email/password login + signup; on success call `/auth/sync`, then redirect. Show seeded credentials hint on the login page in demo mode (nice reviewer touch).

## 8. Validation & Error Handling

- All request schemas live in `packages/shared` (e.g. `updateDocumentSchema`, `createShareSchema`, `tiptapDocSchema` — a permissive-but-typed shape check on `content`).
- Client: same schemas validate forms pre-submit; TanStack Query `onError` → toast.
- Global Hono `onError` → uniform envelope; never leak stack traces in prod.
- Upload: enforce MIME/extension + 1 MB limit server-side; UI states limits up front.

## 9. Testing Strategy

- **Vitest, `packages/api`:** instantiate the Hono app with a test DB (env-switched connection string; `TEST_AUTH_BYPASS` middleware injects a fake user in test env only — flagged clearly in code).
- **Centerpiece:** access-control matrix (stranger/viewer/editor/owner × GET/PATCH/DELETE/share) — ~10 assertions, directly demonstrates D6/D7.
- **Secondary:** Zod rejection cases (bad title, bad content type), import happy path (`.md` → jsonb structure contains heading node).
- Run: `pnpm test` at repo root via Turborepo.

## 10. Deployment

- **Vercel** (apps/web, includes API) + **Neon** free tier. Env vars: `DATABASE_URL`, `FIREBASE_SERVICE_ACCOUNT_JSON` (base64), `NEXT_PUBLIC_FIREBASE_*` client config.
- `pnpm db:migrate` + `pnpm db:seed` (creates Alice/Bob in Firebase via Admin SDK + Postgres, plus one pre-shared sample doc so reviewers see the shared state immediately).
- Smoke test the seeded flow on prod before submitting.

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Firebase Admin on Vercel edge incompatibility | Run API route on Node runtime (`export const runtime = 'nodejs'`) |
| Neon cold starts on free tier | Acceptable for demo; note in architecture doc |
| Tiptap SSR hydration issues | Editor rendered client-only (`immediatelyRender: false` / dynamic import) |
| Timebox overrun | tasks.md phases are strictly ordered; stretch items only after Phase 7 (deploy + docs) is done |
| Lost edits on tab close mid-debounce | Flush save on `beforeunload` / visibility change (cheap, one listener) |

## 12. Deliverables Map (per brief)

Source code (repo) · README (setup + seeded creds) · this design doc doubles as the **architecture note** (trim to 1 page) · AI workflow note (separate md, written during the build — log as you go) · SUBMISSION.md · live URL · video URL txt · screenshots/GIF.
