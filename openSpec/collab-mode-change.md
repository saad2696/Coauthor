# Change: Collaboration Mode v1 (Poll-Based, No Sockets)

> OpenSpec change proposal. Extends the approved plan (spec.md / design.md / tasks.md)
> with near-real-time collaboration built on HTTP polling + optimistic concurrency.
> Status: PROPOSED · Execute only after Phase 8 (deployed core) is green.

---

## Why

The base plan's save model (D8) is last-write-wins with no awareness of other users. That's honest for a timebox, but the assignment explicitly lists "real-time collaboration indicators" as a stretch item, and two seeded users editing the same doc is the exact flow reviewers will try. Full real-time sync (WebSockets/CRDT) is out of budget and out of Vercel-serverless comfort zone — but presence, conflict detection, and freshness polling deliver most of the perceived collaboration value at ~15% of the cost.

## What Changes

- **ADDED** Presence indicators: see who else is viewing/editing a document right now.
- **ADDED** Conflict-safe saves: versioned documents; concurrent overwrites are detected and surfaced, never silent.
- **ADDED** Freshness polling: a reader's open document updates shortly after a collaborator saves.
- **MODIFIED** Autosave requirement: PATCH now carries a base version.
- No changes to sharing/access model — collaboration features respect existing viewer/editor/owner roles.

Explicit non-goals (state in README): live cursors, character-level merging, offline sync, sockets. Upgrade path documented in Design §4.

---

## Spec Delta

### ADDED Requirement: Presence Indicators
The system SHALL show, inside an open document, which other users with access currently have that document open, distinguishing `viewing` from `editing`. Presence SHALL be maintained by client heartbeats (every ~20 s while the tab is visible) and a user SHALL be considered offline when their last heartbeat is older than 45 s.

#### Scenario: Collaborator appears
- **WHEN** Alice has a document open and Bob (editor share) opens the same document
- **THEN** within one poll interval (≤ 10 s) Alice sees Bob's avatar/name chip labeled as present

#### Scenario: Collaborator leaves
- **WHEN** Bob closes the tab or goes idle past the freshness window
- **THEN** Bob's chip disappears from Alice's header within ~45 s, with no server-side cleanup job required (freshness is computed at read time)

#### Scenario: Presence respects access
- **WHEN** presence is requested for a document by a user with no access
- **THEN** the API responds `404`, consistent with the access model

### ADDED Requirement: Conflict-Safe Saves
Documents SHALL carry a monotonically increasing `version`. Every content/title PATCH SHALL include the client's `baseVersion`. The server SHALL apply the update only if `baseVersion` matches the stored version (atomic compare-and-set) and SHALL respond `409 CONFLICT` with the latest `{ version, content, title, updatedBy }` otherwise.

#### Scenario: Clean save increments version
- **WHEN** Bob saves against the current version N
- **THEN** the update applies, the stored version becomes N+1, and the response returns N+1 for the client to adopt

#### Scenario: Stale save is rejected, not silently merged
- **WHEN** Alice and Bob both loaded version N, Alice saves first (→ N+1), then Bob's autosave sends baseVersion N
- **THEN** Bob receives `409` and the editor shows a conflict banner naming who saved, offering: "Load their version" (replace local content) or "Keep mine" (force-save with the latest version as base, overwriting deliberately)

#### Scenario: Force save is deliberate
- **WHEN** Bob chooses "Keep mine"
- **THEN** the client re-sends the PATCH with the fresh baseVersion and Bob's content, which applies as a normal versioned save (an intentional overwrite, not a silent one)

### ADDED Requirement: Document Freshness Polling
While a document is open, the client SHALL poll a lightweight metadata endpoint (~every 10 s, paused when the tab is hidden). If the server version is newer and the local editor has **no unsaved changes**, the client SHALL fetch and swap in the latest content, showing a non-blocking notice ("Updated by Alice just now"). If local changes exist, the client SHALL NOT clobber them and SHALL rely on the 409 flow at save time.

#### Scenario: Reader sees updates without refresh
- **WHEN** Bob has the document open with no local edits and Alice saves a change
- **THEN** Bob's editor reflects Alice's change within one poll interval, without a page reload

#### Scenario: Dirty editor is never clobbered
- **WHEN** Bob has unsaved local edits and Alice saves
- **THEN** Bob's content is left untouched; the conflict surfaces at Bob's next save via 409

### MODIFIED Requirement: Autosave
(Extends the base Autosave requirement.) Autosave PATCHes SHALL include `baseVersion` and SHALL transition the save indicator to a distinct `Conflict` state on 409 instead of generic failure.

---

## Design Delta

### 1. New decisions

| # | Decision | Choice | Alternatives | Rationale |
|---|----------|--------|--------------|-----------|
| D13 | Transport | **HTTP polling** (TanStack Query `refetchInterval`) | WebSockets, SSE, Pusher/Ably | Zero infra on Vercel serverless; Query already in stack; intervals pause on hidden tabs for free (`refetchIntervalInBackground: false`). Sockets need a stateful host or a paid-ish third party — wrong trade for a demo. |
| D14 | Concurrency | **Optimistic concurrency (compare-and-set on `version`)** | Locks, field merging, CRDT | One SQL predicate turns silent data loss into a handled product state; trivially testable; the strongest "engineering maturity" signal per minute in this whole change. |
| D15 | Presence storage | **Postgres upsert table, freshness computed at read** | Redis TTL, in-memory | No new infra; `WHERE last_seen_at > now() - interval '45 seconds'` makes expiry a query concern, so no cron/cleanup needed at demo scale. |
| D16 | Conflict UX | **Banner with two explicit choices** (theirs / mine) | Auto-merge, modal blocking | Honest and simple; auto-merge of rich-text JSON is a research project, not a timebox feature. |

### 2. Schema delta

```sql
ALTER TABLE documents
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN updated_by text REFERENCES users(id);

CREATE TABLE document_presence (
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES users(id),
  mode        text NOT NULL CHECK (mode IN ('viewing','editing')) DEFAULT 'viewing',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, user_id)
);
```

### 3. API delta

| Method | Route | Body | Access | Notes |
|--------|-------|------|--------|-------|
| PATCH | `/documents/:id` | `{ title?, content?, baseVersion }` | owner/editor | CAS: `UPDATE … SET version = version + 1, updated_by = $user WHERE id = $id AND version = $baseVersion RETURNING version`; 0 rows → `409` with latest doc |
| GET | `/documents/:id/meta` | — | owner/editor/viewer | `{ version, updatedAt, updatedBy: { id, displayName } }` — cheap, poll target |
| PUT | `/documents/:id/presence` | `{ mode }` | owner/editor/viewer | Heartbeat upsert; returns fresh presence list (piggyback — saves a second call) |
| GET | `/documents/:id/presence` | — | owner/editor/viewer | Present users where `last_seen_at > now() − 45 s`, excluding self |

All routes reuse `getDocumentAccess()`; no-access → 404 (D7 unchanged).

### 4. Client behavior

- **Heartbeat:** `PUT /presence` on mount, then every 20 s via Query; `mode: 'editing'` when the user typed within the last 30 s, else `'viewing'`. Stop when tab hidden (visibility API — Query handles this).
- **Presence UI:** avatar chips (initials) in the editor header; tooltip "Bob — editing". Excluding self avoids the "you are here" noise.
- **Meta poll:** `GET /meta` every 10 s; compare against local `version`; if newer and editor not dirty → refetch full doc, `editor.commands.setContent(...)`, toast "Updated by Alice".
- **Save flow change:** autosave mutation sends `baseVersion`; on `409` set save state `conflict`, render banner with the two D16 actions; on success adopt returned version.
- **Dirty tracking:** a `hasUnsavedChanges` ref flipped on Tiptap `onUpdate`, cleared on successful save — gates the freshness swap.

### 5. Upgrade path (document in architecture note, do not build)

Polling endpoints are shaped so the transport can be swapped without API redesign: `meta` + `presence` become a single SSE stream or a Pusher/Ably channel keyed by document id; CAS versioning stays as the write-safety layer either way. Mentioning this (one paragraph) shows the cut was a decision, not a ceiling.

### 6. Risks

| Risk | Mitigation |
|------|-----------|
| Polling cost on Neon free tier | 10–20 s intervals, tab-visibility pause, single-row indexed reads — negligible at demo scale; note it |
| 409 loop if client mishandles version adoption | Test covers save → adopt → save sequence; force-save always refetches latest version first |
| Presence flicker at freshness boundary | 45 s window vs 20 s heartbeat gives 2× slack |
| Timebox blowout | Hard order C1 → C2 → C3 with cut lines (see tasks); C1 alone already satisfies the stretch item |

---

## Tasks Delta — Phase 10: Collaboration Mode (≈ 1 h 45 m, strictly after Phase 9)

> Cut line discipline: each block is independently shippable. If time runs out after C1, you still
> have a demoable stretch feature; after C2, you have the strongest story. Never start C3 before C2.

### C1 — Presence indicators (~40 min) ← the listed stretch item
- [ ] C1.1 Migration: `document_presence` table
- [ ] C1.2 `PUT/GET /documents/:id/presence` with access check + freshness filter, heartbeat upserts and returns list
- [ ] C1.3 Client heartbeat via Query interval (20 s, visibility-aware), mode from recent-typing heuristic
- [ ] C1.4 Header avatar chips with viewing/editing tooltip, self excluded
- [ ] C1.5 Manual check: Alice + Bob in two browsers see each other appear/disappear

### C2 — Versioned saves + conflict UX (~40 min) ← highest engineering-signal per minute
- [ ] C2.1 Migration: `version`, `updated_by` on documents; backfill version = 1
- [ ] C2.2 PATCH becomes compare-and-set; 409 returns latest `{ version, title, content, updatedBy }`
- [ ] C2.3 Shared schema update: `baseVersion` required in `updateDocumentSchema`; client adopts returned version
- [ ] C2.4 Conflict banner: "Alice saved while you were editing" → Load theirs / Keep mine (force re-save on fresh version)
- [ ] C2.5 Vitest: stale baseVersion → 409 with latest payload; clean save increments; force-save sequence succeeds

### C3 — Freshness polling (~25 min)
- [ ] C3.1 `GET /documents/:id/meta` endpoint
- [ ] C3.2 10 s meta poll; if newer version && !dirty → refetch + `setContent` + "Updated by X" toast
- [ ] C3.3 Manual check: Bob (idle) sees Alice's save appear without refresh; Bob (dirty) is not clobbered

### Wrap-up
- [ ] C4.1 README + architecture note: add "Collaboration model" paragraph (poll-based, CAS versioning, socket upgrade path)
- [ ] C4.2 Re-record or extend video segment: demo two browsers side by side (presence + conflict banner is a killer 30-second clip)
- [ ] C4.3 Redeploy + prod smoke test with both seeded accounts
