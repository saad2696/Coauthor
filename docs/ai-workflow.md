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
