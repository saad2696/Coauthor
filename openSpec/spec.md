# Spec: Collaborative Document Editor (Ajaia Take-Home)

> OpenSpec capability specification. Every requirement below is normative (SHALL).
> Scenarios are acceptance criteria — the build is done when every scenario passes.
> Scope is deliberately constrained to a 4–6 hour timebox. Anything not specified here is OUT OF SCOPE (see design.md → Non-Goals).

---

## Capability: Authentication

### Requirement: User Authentication
The system SHALL authenticate users via Firebase Authentication (email/password) and SHALL mirror each authenticated user into the application database on first authenticated request.

#### Scenario: Sign up
> **Amended (owner-approved, post-Phase-7):** frontend takes no password. Original password-based scenario preserved below for history.
- **WHEN** a visitor submits their **name and email** on the signup form
- **THEN** the backend (`POST /api/auth/register`) creates the Firebase account with a generated password + display name and upserts a `users` row, and a **password-reset email** is sent so the user sets their own password; they then log in
- *(original)* WHEN a visitor submits a valid email and password (≥ 6 chars) → a Firebase account is created, a `users` row is upserted, redirected to dashboard. **Login still uses email/password**, so seeded reviewer accounts are unaffected.

#### Scenario: Log in
- **WHEN** a registered user submits correct credentials
- **THEN** the user receives a Firebase ID token and is redirected to the dashboard

#### Scenario: Unauthenticated API access rejected
- **WHEN** any `/api/documents*` endpoint is called without a valid Firebase ID token in the `Authorization: Bearer <token>` header
- **THEN** the API responds `401 Unauthorized` with a JSON error body `{ error: { code, message } }`

#### Scenario: Seeded reviewer accounts
- **WHEN** a reviewer opens the deployed app
- **THEN** at least two pre-seeded test accounts (e.g. `alice@test.ajaia.dev` / `bob@test.ajaia.dev`) exist and their credentials are documented in the README, sufficient to demonstrate the full sharing flow

---

## Capability: Document Management

### Requirement: Document Creation
The system SHALL allow an authenticated user to create a new document. New documents SHALL default to the title "Untitled document" and empty content, with the creator recorded as owner.

#### Scenario: Create from dashboard
- **WHEN** a user clicks "New document"
- **THEN** a document is created via `POST /api/documents`, and the user is navigated to `/docs/:id` with the editor focused

### Requirement: Document Rename
The system SHALL allow the document owner and users with editor access to rename a document. Titles SHALL be validated as 1–200 characters after trimming.

#### Scenario: Inline rename
- **WHEN** a user edits the title field in the editor header and blurs or presses Enter
- **THEN** `PATCH /api/documents/:id` persists the new title and the dashboard reflects it on next load

#### Scenario: Invalid title rejected
- **WHEN** a rename request contains an empty or >200-char title
- **THEN** the API responds `400` with a Zod validation error and the UI shows the previous title with an error toast

### Requirement: Document Listing
The system SHALL present the user's documents on a dashboard, visually separated into "My documents" (owned) and "Shared with me" (granted access). Each entry SHALL show title and last-updated time.

#### Scenario: Owned vs shared distinction
- **WHEN** user B has one owned document and one document shared to them by user A
- **THEN** the dashboard renders the owned document under "My documents" and A's document under "Shared with me", each section labeled

### Requirement: Document Deletion
The system SHALL allow only the owner to delete a document. Deletion SHALL cascade to its share records.

#### Scenario: Non-owner delete rejected
- **WHEN** a user with shared access calls `DELETE /api/documents/:id`
- **THEN** the API responds `403 Forbidden` and the document remains

---

## Capability: Rich-Text Editing

### Requirement: Rich-Text Formatting
The editor SHALL support at minimum: **bold**, *italic*, underline, headings (H1, H2), and bulleted + numbered lists, applied via a visible toolbar and standard keyboard shortcuts (Cmd/Ctrl+B, I, U).

#### Scenario: Apply formatting
- **WHEN** a user selects text and clicks the Bold toolbar button (or presses Cmd/Ctrl+B)
- **THEN** the selection is rendered bold, the toolbar button shows an active state, and the change is included in the next autosave

#### Scenario: Formatting survives reload
- **WHEN** a user applies a heading, a bulleted list, and bold text, waits for the "Saved" indicator, then hard-refreshes the page
- **THEN** the document re-renders with identical formatting

### Requirement: Autosave
The editor SHALL autosave content changes, debounced at ~800 ms after the last keystroke, and SHALL display save state as one of: `Saving…`, `Saved`, `Save failed — retry`.

#### Scenario: Failed save is surfaced
- **WHEN** an autosave request fails (network error or 5xx)
- **THEN** the UI shows "Save failed" with a retry affordance and does not silently drop edits

### Requirement: Content Model
Document content SHALL be persisted as Tiptap/ProseMirror JSON in a `jsonb` column, preserving structure (marks, headings, lists) losslessly.

#### Scenario: Round-trip fidelity
- **WHEN** a document containing every supported mark/node type is saved and re-fetched
- **THEN** the JSON deserializes into an identical editor state

---

## Capability: File Import

### Requirement: File Upload Creates Document
The system SHALL allow an authenticated user to upload a `.txt` or `.md` file (≤ 1 MB) and SHALL convert it into a new editable document owned by the uploader. Markdown SHALL be converted to rich text (headings, lists, bold/italic preserved where expressible). Supported types and the size limit SHALL be stated in the upload UI and README.

#### Scenario: Import a markdown file
- **WHEN** a user uploads `notes.md` containing headings, a list, and bold text
- **THEN** a new document titled `notes` is created, opens in the editor, and the formatting is editable rich text

#### Scenario: Import a plain text file
- **WHEN** a user uploads `todo.txt`
- **THEN** a new document titled `todo` is created with the file contents as paragraphs

#### Scenario: Unsupported type rejected
- **WHEN** a user uploads a `.pdf` or a file > 1 MB
- **THEN** the API responds `400` with a clear message and the UI explains supported types/limits

---

## Capability: Sharing

### Requirement: Share by Email
The system SHALL allow a document owner to grant access to another **registered** user by entering their email. Each grant SHALL record a role of `viewer` or `editor` (default `editor`). Sharing SHALL be idempotent per (document, user) — re-sharing updates the role instead of duplicating.

#### Scenario: Successful share
- **WHEN** owner A shares a document with `bob@test.ajaia.dev` as editor
- **THEN** a `document_shares` row is created, and the document appears in B's "Shared with me" list on next dashboard load

#### Scenario: Share with unknown email
- **WHEN** the owner enters an email with no matching registered user
- **THEN** the API responds `404` with `USER_NOT_FOUND` and the UI explains only registered users can be shared with (scope cut, documented)

#### Scenario: Only owner can share
- **WHEN** a user with editor access (not owner) calls `POST /api/documents/:id/shares`
- **THEN** the API responds `403 Forbidden`

### Requirement: Access Enforcement
The system SHALL enforce access on every document read/write: owner → full access; `editor` share → read + edit content/title; `viewer` share → read only; no share → `404 Not Found` (not 403, to avoid leaking document existence).

#### Scenario: Viewer cannot edit
- **WHEN** a `viewer` share holder sends `PATCH /api/documents/:id`
- **THEN** the API responds `403` and the editor UI is rendered read-only for that user

#### Scenario: Stranger cannot read
- **WHEN** an authenticated user with no share on document X calls `GET /api/documents/X`
- **THEN** the API responds `404`

### Requirement: Share Management
The owner SHALL be able to view current collaborators on a document and revoke access.

#### Scenario: Revoke access
- **WHEN** the owner removes B from the share list
- **THEN** B's subsequent requests for that document return `404` and it disappears from B's dashboard

---

## Capability: Persistence

### Requirement: Durable Storage
All documents, users, and shares SHALL persist in Neon Postgres such that data survives page refresh, session expiry, and server restarts/redeploys.

#### Scenario: Survives refresh and re-login
- **WHEN** a user edits a document, logs out, and logs back in
- **THEN** the document appears with the latest saved content and formatting

---

## Capability: Engineering Quality

### Requirement: Input Validation
Every API endpoint SHALL validate its inputs (params, body, query) with Zod via `@hono/zod-validator`, responding `400` with structured error details on failure.

#### Scenario: Malformed body rejected
- **WHEN** `PATCH /api/documents/:id` receives a body with `content` as a string instead of an object
- **THEN** the API responds `400` with the failing field path in the error body

### Requirement: Automated Tests
The repository SHALL include at least one meaningful automated test suite runnable with a single command (`pnpm test`). The suite SHALL cover the access-control matrix (owner/editor/viewer/stranger × read/write/share) as its centerpiece.

#### Scenario: Access-control matrix test
- **WHEN** `pnpm test` runs
- **THEN** tests assert: stranger read → 404, viewer write → 403, editor write → 200, non-owner share → 403, owner share → 201

### Requirement: Deployment
The system SHALL be deployed to a publicly reachable URL (Vercel + Neon free tiers) requiring no paid dependency for reviewers, with seeded accounts working in production.

#### Scenario: Reviewer end-to-end
- **WHEN** a reviewer logs in as Alice on the live URL, creates + formats a document, shares it with Bob, then logs in as Bob
- **THEN** the entire flow works without local setup
