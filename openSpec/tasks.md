# Tasks: Collaborative Document Editor (Ajaia Take-Home)

> OpenSpec implementation checklist. Execute phases in order — each phase ends in a
> working, committable state. Time budget totals ~5.5h against the 4–6h limit.
> Rule: if a phase overruns by >50%, cut its remaining nice-to-haves and move on.
> Log AI usage notes into `docs/ai-workflow.md` as you go (don't reconstruct at the end).

## Execution Protocol (stop → reflect → commit)

Apply this loop at the end of **every numbered task** (lightweight) and **every phase** (full).
Do not start the next task until the current one is closed out. No batching commits across phases.

**Per task (~1 min):**
1. **Verify** — does the change do what the task says? Run the relevant command (`pnpm build`, `pnpm test`, curl the endpoint, or click the UI path).
2. **Reflect** — did this drift from `spec.md` or `design.md`? If a decision changed mid-task, update the doc *now* (one line), don't carry silent drift.
3. **Mark** — tick the checkbox `- [x]` in this file.
4. **Commit** — one commit per task, message format: `feat(phase-N): <task-id> <summary>` (e.g. `feat(phase-3): 3.2 GET /documents returns owned+shared`). Docs-only changes: `docs: ...`.

**Per phase (~3 min):**
1. **Scenario check** — open `spec.md`, find the scenarios this phase implements, and walk each WHEN/THEN manually or via test. A phase is not done until its scenarios pass.
2. **Timebox check** — compare actual vs budgeted time; if >50% over, invoke the cut rule and note what was dropped in `SUBMISSION.md`'s "incomplete" section immediately.
3. **AI log** — append 2–3 bullets to `docs/ai-workflow.md`: what AI generated, what you rejected/rewrote, how you verified.
4. **Commit + tag** — `git commit` then `git tag phase-N-done`. Push. (Tags give you a clean rollback point and make the commit history itself a deliverable — reviewers can see delivery discipline.)

**If a task fails verification:** fix forward within the task's budget; if it can't be fixed in time, revert to the last green commit, mark the task `- [ ] (deferred)`, and record it in SUBMISSION.md. Never leave the repo in a broken state between tasks.

## Phase 0 — Scaffold & Tooling (40 min)

- [x] 0.1 Init pnpm workspace + Turborepo; create `apps/web`, `packages/{api,db,shared,config}`
- [x] 0.2 `apps/web`: Next.js (App Router, TS, Tailwind); strict tsconfig shared from `packages/config`
- [x] 0.3 `packages/shared`: install zod; export placeholder schema to verify cross-package imports build
- [x] 0.4 Root scripts: `dev`, `build`, `lint`, `test`, `db:generate`, `db:migrate`, `db:seed` wired through turbo
- [x] 0.5 Create Neon project + Firebase project (enable Email/Password); capture env vars in `.env.example`
- [x] 0.6 Initial commit; create GitHub repo; connect Vercel early (deploy the skeleton now — de-risks Phase 8) — repo + push done; Vercel deferred to Phase 8 (per owner decision, recorded)

## Phase 1 — Database Layer (30 min)

- [x] 1.1 `packages/db`: Drizzle + `@neondatabase/serverless`; define `users`, `documents`, `document_shares` per design.md §5
- [x] 1.2 Generate + run first migration against Neon
- [x] 1.3 Seed script: creates Alice + Bob in Firebase (Admin SDK) and Postgres; creates one sample doc owned by Alice, shared to Bob as editor
- [x] 1.4 Export typed db client + tables from package index

## Phase 2 — API Skeleton & Auth (45 min)

- [x] 2.1 `packages/api`: Hono app factory `createApp(deps)`; mount in `apps/web/app/api/[[...route]]/route.ts` with `runtime = 'nodejs'`
- [x] 2.2 Auth middleware: verify Firebase ID token (firebase-admin, service account from env), set `c.var.user`, 401 otherwise
- [x] 2.3 `POST /auth/sync`: upsert user row from token claims
- [x] 2.4 Uniform error envelope + global `onError`; `zValidator` wired with shared schemas
- [x] 2.5 Smoke test with curl: 401 without token, sync works with real token

## Phase 3 — Document CRUD (40 min)

- [x] 3.1 `getDocumentAccess(docId, userId)` helper (owner → shares lookup)
- [x] 3.2 `GET /documents` → `{ owned, shared }` (join shares for role, order by updated_at desc)
- [x] 3.3 `POST /documents`, `GET /documents/:id`, `PATCH /documents/:id` (title/content, bumps updated_at), `DELETE /documents/:id`
- [x] 3.4 Enforce: no access → 404; viewer PATCH → 403; non-owner DELETE → 403
- [x] 3.5 Shared Zod schemas: `createDocumentSchema`, `updateDocumentSchema`, `tiptapDocSchema`

## Phase 4 — Frontend: Auth + Dashboard (45 min)

- [x] 4.1 Firebase client SDK setup; auth context/hook exposing user + `getIdToken()`
- [x] 4.2 Typed API client (fetch wrapper attaching Bearer token) + TanStack Query provider
- [x] 4.3 `/login` + `/signup` pages (call `/auth/sync` on success); route guard redirecting unauthenticated users
- [x] 4.4 Dashboard: "My documents" / "Shared with me" sections, role badges, updated-ago, New document button → create + redirect
- [x] 4.5 Login page shows seeded demo credentials hint

## Phase 5 — Editor (60 min)

- [x] 5.1 Tiptap editor (StarterKit + Underline), client-only mount, loads content from `GET /documents/:id`
- [x] 5.2 Toolbar: B / I / U / H1 / H2 / bullet list / ordered list with active states; keyboard shortcuts verified
- [x] 5.3 Inline title rename (blur/Enter → PATCH)
- [x] 5.4 Debounced autosave (800 ms) with `Saving… / Saved / Save failed` indicator; flush on `beforeunload`
- [x] 5.5 Read-only mode for viewer role (editable=false, toolbar hidden, "View only" badge)
- [x] 5.6 Manual check: format everything, refresh, confirm lossless round-trip (spec: Formatting survives reload)

## Phase 6 — File Import (30 min)

- [x] 6.1 `POST /import`: multipart, accept `.txt`/`.md` ≤ 1 MB, reject otherwise with clear 400
- [x] 6.2 Convert: `.md` → marked → `generateJSON` (Tiptap html util) → jsonb; `.txt` → paragraph nodes; title from filename
- [x] 6.3 Dashboard Import button (file input) → upload → redirect to new doc; UI states supported types + limit

## Phase 7 — Sharing (40 min)

- [ ] 7.1 `POST /documents/:id/shares` (email + role, owner-only, upsert, 404 USER_NOT_FOUND), `GET .../shares`, `DELETE .../shares/:userId`
- [ ] 7.2 Share dialog in editor header: email input, role select (viewer/editor), collaborator list with revoke
- [ ] 7.3 End-to-end manual check: Alice shares → Bob sees in "Shared with me" → Bob (editor) edits → Alice sees update; viewer role is read-only

## Phase 8 — Tests, Polish, Deploy (50 min)

- [ ] 8.1 Vitest in `packages/api` with test-env auth bypass + test DB URL
- [ ] 8.2 Access-control matrix suite (stranger/viewer/editor/owner × read/write/delete/share) — must pass
- [ ] 8.3 Validation tests: bad title, bad content shape, oversized/unsupported import
- [ ] 8.4 Error toasts wired everywhere mutations can fail; empty states for dashboard sections
- [ ] 8.5 Production deploy: env vars on Vercel, migrate + seed prod Neon, full smoke test of the reviewer flow on live URL

## Phase 9 — Deliverables (45 min, non-code — protect this time)

- [ ] 9.1 README.md: stack summary, local setup (pnpm i → env → db:migrate → db:seed → dev), seeded credentials, supported import types, scope cuts
- [ ] 9.2 Architecture note (1 page, distilled from design.md §3–§8: decisions D1–D12 table is the core)
- [ ] 9.3 AI workflow note: tools used, where AI sped things up, what was rejected/rewritten, how correctness was verified (tests + manual matrix + prod smoke)
- [ ] 9.4 SUBMISSION.md: contents list, live URL, credentials, what works / what's partial / next 2–4 hours
- [ ] 9.5 Record 3–5 min Loom: user flow → what works E2E → deliberate cuts → key decisions (D1, D6, D8) → AI workflow
- [ ] 9.6 Google Drive folder: code zip/link, README, architecture note, AI note, SUBMISSION.md, video-url.txt, screenshots/GIF

## Stretch (only if everything above is done and deployed)

> Priority stretch: **Phase 10 — Collaboration Mode** (presence, versioned conflict-safe saves,
> freshness polling). Full plan in `collab-mode-change.md`. Prefer it over the items below —
> C1 alone satisfies the brief's "real-time collaboration indicators" stretch item.

- [ ] S.1 `.docx` import via mammoth (html → generateJSON)
- [ ] S.2 "Last edited by" on shared docs (free once Phase 10 C2 adds `updated_by`)
- [ ] S.3 Export to Markdown (tiptap JSON → md)
- [ ] S.4 Optimistic title rename + document list updates
