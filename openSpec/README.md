# OpenSpec Bundle — Collaborative Document Editor (Ajaia Take-Home)

Complete spec-driven plan for the assignment. Drop this `openspec/` folder into the repo root
and drive the entire build from it.

## Files & reading order

| File | Role | Read when |
|------|------|-----------|
| `spec.md` | **WHAT** — normative requirements (SHALL) + WHEN/THEN acceptance scenarios for every capability: auth, documents, editing, autosave, import, sharing, persistence, quality | First. Also your manual QA checklist before recording the video |
| `design.md` | **WHY/HOW** — architecture, monorepo layout, data model, full API surface, decisions D1–D12 with alternatives + rationale, risks, deployment | Second. Decisions are final — don't re-litigate mid-build |
| `tasks.md` | **ORDER** — Execution Protocol (stop → reflect → commit per task; scenario-check + tag per phase), then Phases 0–9 (~5.5h) + stretch | Live document during the build; tick checkboxes as you go |
| `collab-mode-change.md` | **CHANGE PROPOSAL** — Collaboration Mode v1 (poll-based): presence (C1), versioned conflict-safe saves (C2), freshness polling (C3). Spec deltas + D13–D16 + Phase 10 tasks | Only after Phase 9 is deployed and green |

## Stack (locked)

pnpm + Turborepo monorepo · Next.js App Router · Hono mounted at `/api/[[...route]]` ·
Zod schemas in `packages/shared` (single contract for API + UI) · Drizzle + Neon Postgres ·
Firebase Auth (client SDK + admin token verification) · Tiptap (JSON in jsonb) ·
TanStack Query · Vitest · Vercel deploy.

## Hard rules

1. **Execution Protocol is not optional** — verify, reflect on spec/design drift, tick checkbox,
   commit after *every* task (`feat(phase-N): <task-id> <summary>`); scenario-walk + `git tag phase-N-done`
   after every phase. Never batch. Never leave the repo broken between tasks.
2. **Timebox:** 4–6h. If a phase overruns >50%, cut its nice-to-haves and record the cut in SUBMISSION.md.
3. **Phase 9 (deliverables) is protected time** — a deployed core with a great README beats an
   undeployed everything.
4. **Log AI usage as you go** into `docs/ai-workflow.md` (per-phase checkpoint forces this).
5. Collaboration Mode order is strict: C1 → C2 → C3. Never start C3 before C2.

## Claude Code kickoff prompt

> Read openspec/README.md, spec.md, design.md, and tasks.md. Implement tasks.md phase by phase,
> starting at Phase 0. spec.md scenarios are the acceptance criteria; design.md decisions D1–D12
> are final — do not substitute alternatives. Follow the Execution Protocol in tasks.md strictly:
> verify each task, update its checkbox, and commit after every task; scenario-check and tag after
> every phase; never batch commits. If a decision must change, update the doc in the same commit.
> Do not start collab-mode-change.md unless I explicitly say so.

## Assignment deliverables map

Source code · README (setup + seeded creds: alice@/bob@test.ajaia.dev) · architecture note
(distill design.md §3–§8) · AI workflow note (assembled from per-phase logs) · SUBMISSION.md ·
live Vercel URL · walkthrough video URL · screenshots/GIF.
