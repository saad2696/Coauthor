# Submission — Coauthor

Collaborative rich-text document editor. Built spec-driven from `openspec/` against a
4–6 hour timebox, with a strict per-task commit / per-phase tag protocol.

## Contents

- **Source** — this repo (`saad2696/Coauthor`), pnpm + Turborepo monorepo
- **README.md** — stack, local setup, seeded credentials, features, scope cuts
- **docs/architecture.md** — 1-page architecture note (decisions D1–D12 + D4 amendment)
- **docs/ai-workflow.md** — AI workflow note (summary + per-phase log)
- **DEPLOY.md** — Vercel + Neon deploy steps (deploy deferred this session)
- **Tests** — `pnpm test` (Vitest, 24 tests; access-control matrix centerpiece)
- **openspec/** — the spec/design/tasks the build followed

## Live URL

Not deployed this session (deferred by owner). Run locally:

```bash
pnpm install && cp .env.example .env   # fill in values
pnpm db:migrate && pnpm db:seed
pnpm dev                                # http://localhost:3000
```

## Credentials (seeded)

| Email | Password |
|-------|----------|
| `alice@test.ajaia.dev` | `password123` |
| `bob@test.ajaia.dev` | `password123` |

Alice owns a sample document already shared with Bob (editor).

## What works (verified end-to-end)

- **Auth** — email/password login; passwordless signup (name + email → backend creates
  account + password-reset email). Unauthenticated API → 401.
- **Documents** — create, rich-text edit (B/I/U, H1/H2, bullet/numbered lists), inline
  rename, debounced autosave with save-state + retry; lossless content round-trip.
- **Import** — `.txt` / `.md` (≤ 1 MB) → editable doc; unsupported/oversize → clear 400.
- **Sharing** — search + pick registered users (viewer/editor), collaborator list +
  revoke, dashboard shows who each owned doc is shared with.
- **Access control** — owner/editor/viewer/none enforced server-side; no-access → 404.
  Proven by the Vitest access-matrix (`pnpm test` → 24 passing) and real-token E2E runs.
- **Persistence** — Neon Postgres; survives refresh / re-login / restart.

## What's partial / deferred

- **8.5 Production deploy** — not deployed; `DEPLOY.md` has the steps. Prod is intended
  to reuse the same Neon DB (already migrated + seeded).
- **9.5 Walkthrough video** — to record (Loom/screen capture of the reviewer flow).
- **9.6 Deliverables folder** — to assemble (links + screenshots).
- Reset-password signup requires the mailbox to receive Firebase's email; login with
  the seeded accounts is the friction-free reviewer path.

## Deviations from the original spec (owner-approved, recorded in-repo)

- **Auth signup** changed from email+password to **name+email + backend-provisioned
  account + password-reset email** (design D4 amendment; login unchanged). Written back
  into `openspec/spec.md` and `openspec/design.md`.
- **Extras added on request:** dashboard "shared with" avatars, registered-user search
  dropdown in the share dialog, skeleton loaders, instant title reflection via Query
  cache sync.

## If I had another 2–4 hours

1. Deploy to Vercel + smoke-test the reviewer flow on a live URL (8.5).
2. Record the walkthrough video (9.5) and assemble the deliverables folder (9.6).
3. Add a couple of frontend tests (editor autosave, share flow) to complement the API suite.
4. Rate-limit / CAPTCHA the public `POST /auth/register` endpoint.
5. Optional stretch: `.docx` import (mammoth), export to Markdown, "last edited by".
