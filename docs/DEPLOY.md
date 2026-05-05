# Deploy

JobCopilot is a single-tenant personal tool. The intended deploy target is Vercel (web) plus a hosted Supabase project (Postgres + Auth + Storage).

## Prerequisites

- Vercel account with the repo linked
- Supabase project (production, separate from local dev)
- Google + GitHub OAuth apps configured for the production domain
- Anthropic API key with access to the model used in `apps/web/src/lib/claude.ts`

## Vercel (web)

1. `vercel link` — connect the local checkout to the Vercel project.
2. In the Vercel dashboard, set environment variables that mirror `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (Supabase pooled connection string)
   - `DIRECT_URL` (Supabase direct connection string — used by Prisma migrations / `db:push`)
   - `ANTHROPIC_API_KEY` — **required at runtime**. The four AI route handlers (`/api/ai/*`) read this directly. Phase 2a (BYO per-user keys) is designed but not shipped, so the env-var key is still the only auth path.
   - `NEXT_PUBLIC_APP_URL` — production URL, e.g. `https://jobcopilot.vercel.app`
3. `vercel --prod` to deploy.

The Next.js build runs `turbo build --filter=@jobcopilot/web`. Vercel auto-detects the pnpm + Turbo monorepo via `pnpm-workspace.yaml`.

## Supabase (database + auth)

### Schema

This project uses `prisma db push` (not Prisma migrations) — schema changes are applied directly from `packages/db/prisma/schema.prisma`. There is no `migrations/` directory and no `migrate deploy` step.

To apply the current schema to the production Supabase database:

```bash
# With production DATABASE_URL + DIRECT_URL exported (or in a prod .env)
pnpm -F @jobcopilot/db db:push
```

Run this once at initial setup and again whenever `schema.prisma` changes. `db:push` is non-destructive for additive changes; for destructive changes (column drops, type changes), Prisma will prompt for confirmation — review carefully against production data.

### RLS policies

```bash
pnpm -F @jobcopilot/db apply:policies
```

`apply:policies` runs `packages/db/scripts/apply-policies.mjs`, which executes `packages/db/supabase/policies.sql`. The script is idempotent — re-running it after a schema change is safe.

## Auth callback URL

In Supabase → Authentication → URL Configuration:

- Add `https://<vercel-domain>/api/auth/callback` to the allowed redirect URLs.

In the Google OAuth app and GitHub OAuth app:

- Add the same callback URL to each provider's authorized redirect URIs.

## Sanity check after deploy

1. Visit the production URL → `/login` renders.
2. Sign in with Google or GitHub → lands on `/dashboard`.
3. Add a test application → confirm it persists (Supabase row appears).
4. Generate a cover letter draft → confirm Anthropic call succeeds (no 401 / no missing-key error in Vercel logs).
