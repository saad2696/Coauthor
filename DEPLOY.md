# Deploying Coauthor (Vercel + Neon)

The app is a pnpm + Turborepo monorepo; the deployable is `apps/web` (Next.js,
with the Hono API mounted at `/api/[[...route]]` on the Node runtime).

## 1. Import the repo into Vercel

1. https://vercel.com/new → import `saad2696/Coauthor`.
2. **Root Directory:** `apps/web`
3. **Framework Preset:** Next.js (auto-detected)
4. Build / Install commands: leave defaults. Vercel detects the pnpm workspace and
   installs from the repo root; `transpilePackages` compiles the `@coauthor/*`
   packages. `packageManager` pins pnpm via corepack.

## 2. Environment variables (Project → Settings → Environment Variables)

Copy the values from your local `.env` (do **not** commit them). Set all of these
for the Production environment:

| Key | Notes |
|-----|-------|
| `DATABASE_URL` | Same Neon pooled string used locally (DB is already migrated + seeded) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Base64 of the service-account JSON |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | |

## 3. Deploy, then authorize the domain

1. Click **Deploy**. Note the production URL (e.g. `coauthor.vercel.app`).
2. Firebase Console → **Authentication → Settings → Authorized domains** → add the
   Vercel domain. (Required for login/signup to work in production.)

## 4. Database

The Neon database is shared with local and is already migrated + seeded, so the
production app has Alice/Bob and the sample shared document immediately. To target
a fresh database instead, set a different `DATABASE_URL` and run, from the repo root
with that URL in `.env`:

```bash
pnpm db:migrate
pnpm db:seed
```

## 5. Smoke test the live URL

- `GET https://<domain>/api/health` → `{ "ok": true }`
- Log in as `alice@test.ajaia.dev` / `password123` → dashboard shows the sample doc
- Format + rename, share with Bob, log in as Bob → appears under "Shared with me"
