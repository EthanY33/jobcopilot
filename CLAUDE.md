# jobcopilot

Ethan's personal AI-assisted job-application tool, **not multi-tenant SaaS**. Next.js 14 (App Router) + TypeScript + Supabase + Prisma + Claude API, pnpm monorepo: `apps/web` (Next app), `packages/db` (Prisma schema + Supabase RLS policies), `packages/shared` (types + Zod schemas), `packages/prompts` (Claude prompt templates + eval harness).

## Setup
- Node 20 LTS (enforced). pnpm only, via Corepack (version pinned in root `package.json`); `npm install` won't work.
- `cp .env.example .env`: Supabase URL + anon key + service-role key, Anthropic API key.

## Commands
```
pnpm install
pnpm -F @jobcopilot/db db:push          # push schema to Supabase
pnpm -F @jobcopilot/db apply:policies   # apply RLS policies
pnpm -F @jobcopilot/db generate         # regen Prisma client after schema edits (turbo also runs it before typecheck/test/build)
pnpm dev                                # apps/web on :3000
pnpm test                               # vitest unit + integration
pnpm test:e2e                           # playwright e2e (own dev server on :3100 w/ mocks; needs E2E_PASSWORD)
pnpm lint / pnpm typecheck              # turbo lint / tsc across workspaces
pnpm -F @jobcopilot/prompts eval        # prompt regression harness
```

## Verification
- No `.github/workflows/`; Vercel only catches build failures on push. `typecheck`, `test`, `test:e2e`, prompts `eval` are local-only gates: run them before pushing anything portfolio-visible.
- **Never change prompt templates without running the eval**; a regression there ships silently.

## Rules
- TS is strict-plus (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`): `arr[i]` is `T | undefined`, nullish-check before use. Match existing patterns.
- Auth: OAuth only (Google, GitHub). **No email/password** without a spec change.
- Auth routing stays centralized in `apps/web/src/middleware.ts` (delegates to `lib/supabase/middleware.ts`): signed-in `/` redirects to `/dashboard`, signed-out `/` is the marketing landing. No auth checks in route components.
- RLS policies are version-controlled in `packages/db`. Schema and policy changes are coupled: run `db:push` + `apply:policies` together. Never edit policies in the Supabase dashboard (drift).
- UI: Tailwind + shadcn/ui primitives only, no new component libraries. Add components from `apps/web/` via `pnpm dlx shadcn@latest add <name>` (config `apps/web/components.json`; old `shadcn-ui` CLI is deprecated and won't work).
- Zod schemas in `packages/shared` are the client/server contract; edit there, not at call sites.

## Planning docs
Read the latest dated file in each before changing direction: `docs/specs/` (designs: original, BYO multi-provider AI, UI redesign, marketing landing), `docs/plans/` (sequenced breakdowns: phase1, byo-anthropic-phase-2a, ui-redesign), `docs/directives/` (active execution), `docs/superpowers/plans/` (superpowers-workflow long-form plans).

## Other
- `.claude/scheduled_tasks.lock` exists: something runs on a schedule. Check before launching background work or scheduling a competing task.
- Deploy: Vercel (not deployed yet; no production URL). Read `docs/DEPLOY.md` before any deploy advice. **Don't deploy from a session without explicit user confirmation.**
- `marketing/` (repo root, untracked): trailer builds (`*.mp4` gitignored, never commit) and `trailer-build-scaffold/`. Not the marketing landing page (that's `apps/web` route `/`).
