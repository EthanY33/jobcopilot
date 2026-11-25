# Deploy

JobCopilot is a single-tenant personal tool. The intended deploy target is Vercel (web) plus a hosted Supabase project (Postgres + Auth).

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
   - `DATABASE_URL` (Supabase pooled connection string)
   - `DIRECT_URL` (Supabase direct connection string — used by `db:push` and the `apply:policies` script)
   - `ANTHROPIC_API_KEY` — **required at runtime**. All four AI route handlers (cover-letter draft, bullet suggestions, posting extract, resume parse) read this via `apps/web/src/lib/claude.ts`. Phase 2a (BYO per-user keys) is designed but not shipped, so the env-var key is still the only auth path.
   - `AUTH_ALLOWED_EMAILS`: **required in production**. Comma-separated list of the emails that may sign in, for example `you@example.com` (case-insensitive, spaces around entries are ignored). When it is unset or empty in a production build, every sign-in is denied and the server logs one line naming the variable. Vercel Preview deployments are production builds too, so set it for Preview as well as Production. See "Restrict sign-in to the owner" below.
   - `NEXT_PUBLIC_APP_URL` — production URL, e.g. `https://<your-project>.vercel.app`

   `SUPABASE_SERVICE_ROLE_KEY` is NOT needed on Vercel — it's only used by the local Playwright auth setup (`apps/web/tests/e2e/auth.setup.ts`).
3. `vercel --prod` to deploy.

Vercel auto-detects the pnpm + Turbo monorepo via `pnpm-workspace.yaml` and runs `pnpm build` (which invokes `turbo run build` per `package.json`).

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

The script verifies the database server certificate. Download the CA certificate from the Supabase dashboard (Project Settings, Database, SSL Configuration) and set `DB_SSL_CA_FILE` to its absolute path (a relative path resolves from `packages/db`). Without it the script stops with a certificate error and changes nothing. `APPLY_POLICIES_INSECURE_TLS=1` skips verification for a one-off run on a trusted network. TLS options inside `DIRECT_URL`, such as `sslmode`, are ignored by this script.

## Auth callback URL

In Supabase → Authentication → URL Configuration:

- Add `https://<vercel-domain>/api/auth/callback` to the allowed redirect URLs.

In the Google OAuth app and GitHub OAuth app:

- Add the same callback URL to each provider's authorized redirect URIs.

## Restrict sign-in to the owner

A new Supabase project accepts sign-ups from any Google or GitHub account, and every signed-in user spends the owner's `ANTHROPIC_API_KEY`. Two layers close that, and a deploy needs both.

### 1. App allowlist

Set `AUTH_ALLOWED_EMAILS` in Vercel (see the list above). The check lives in `apps/web/src/lib/auth/allowlist.ts` and runs in two places:

- `/api/auth/callback`: an account that is not on the list is signed out and sent to `/login?error=not_allowed`, where the page says "This account is not allowed to sign in."
- The middleware: a session for an account that is not on the list is redirected to that login page on app pages and gets `403 {"error":"not_allowed"}` on `/api` routes.

Use the email on the Google or GitHub account itself (for GitHub, its primary email). If a sign-in is refused, Supabase -> Authentication -> Users shows the email that account arrived with. A Google account and a GitHub account with different emails are two separate users, and each one needs its own entry.

Changing the variable only takes effect on the next deployment.

### 2. Supabase Auth settings

The allowlist only guards this app. The anon key is public, so anyone can still create a user through the project's Auth API until sign-ups are closed in Supabase itself:

1. Deploy, then sign in once with each account listed in `AUTH_ALLOWED_EMAILS` so its user exists.
2. In Supabase -> Authentication -> Sign In / Providers (older dashboards: Providers and Settings), turn off "Allow new users to sign up".
3. On the same page, disable the Email provider. The app only signs in with Google and GitHub, so no password sign-in should be possible on the production project.
4. In Authentication -> Users, check that only the expected accounts exist and delete any other. That includes `e2e@jobcopilot.test`, which exists if the Playwright suite was ever pointed at this project: its original password was committed to this repo and is still in the git history.

Keep the Email provider on in the local dev project. The Playwright auth setup signs in there with a password.

To let another account in later: add its email to `AUTH_ALLOWED_EMAILS`, redeploy, turn sign-ups back on, have the account sign in once, then turn sign-ups off again.

### Self-hosting

The `/api` allowlist check and the cross-site write check run in the Next.js middleware; the route handlers do not repeat them. Next.js releases before 14.2.25 let a request skip middleware with an `x-middleware-subrequest` header (CVE-2025-29927). This repo pins Next.js 14.2.35, which includes the fix, so `next start` and standalone servers are covered as well as Vercel. Do not downgrade Next.js below 14.2.25.

## Sanity check after deploy

1. Visit the production URL → `/login` renders.
2. Sign in with Google or GitHub → lands on `/dashboard`.
3. Add a test application → confirm it persists (Supabase row appears).
4. Generate a cover letter draft → confirm Anthropic call succeeds (no 401 / no missing-key error in Vercel logs).
5. Sign in with an account that is not in `AUTH_ALLOWED_EMAILS`: it lands back on `/login` with an error message and never reaches `/dashboard`.
