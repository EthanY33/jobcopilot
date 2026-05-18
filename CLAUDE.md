# CLAUDE.md — jobcopilot project memory

Personal AI-assisted job-application tool. **Not a multi-tenant SaaS** — this is Ethan's tool that he uses himself. Next.js 14 + TypeScript + Supabase + Prisma + Claude API. pnpm monorepo.

## Monorepo layout

```
apps/web                    # Next.js 14 app (App Router)
packages/db                 # Prisma schema + Supabase RLS policies
packages/shared             # shared types + Zod schemas
packages/prompts            # Claude prompt templates + eval harness
```

## Build / test commands

```
pnpm install                                    # Corepack pins pnpm version
cp .env.example .env                            # Supabase + Anthropic keys
pnpm -F @jobcopilot/db db:push                  # push schema to Supabase
pnpm -F @jobcopilot/db apply:policies           # apply RLS policies
pnpm dev                                        # apps/web on :3000

pnpm test                                       # vitest unit + integration
pnpm test:e2e                                   # playwright e2e (auto-starts dev w/ mocks)
pnpm -F @jobcopilot/prompts eval                # prompt regression harness
```

**Don't change prompt templates without running the eval harness.** It exists to catch regressions before they ship.

## TypeScript

`tsconfig.base.json` is strict-plus: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`. Practical effect — `arr[i]` types as `T | undefined`; nullish-check before use. Match the existing pattern, don't fight it.

## Required env

- Node 20 LTS (enforced)
- pnpm via Corepack (version pinned in root `package.json`)
- Supabase: URL + anon key + service-role key
- Anthropic API key

Vanilla `npm install` will not work — pnpm is the only supported manager.

## Auth model

OAuth-only. Google + GitHub. **No email/password.** Don't add it without spec change.

## Routing

Auth-aware redirects live in `apps/web/src/middleware.ts`. Authenticated users on `/` redirect to `/dashboard`; the unauthenticated `/` is the marketing landing. Don't add auth checks inside route components — keep auth-routing centralized in middleware.

## Where pending work is tracked

Layered planning system:

- **Specs** (high-level designs): `docs/specs/*.md` — current set covers original design, BYO multi-provider AI, UI redesign, marketing landing.
- **Plans** (sequenced work breakdown): `docs/plans/*.md` — phase1, byo-anthropic-phase-2a, ui-redesign.
- **Directives** (active execution): `docs/directives/*.md` — what's actually being worked on right now.
- **Superpowers plans**: `docs/superpowers/plans/` — long-form plans authored via the superpowers workflow.

**Always read the latest dated file in each subfolder before changing direction.**

## Scheduled tasks lock

`.claude/scheduled_tasks.lock` exists — something runs on a recurring schedule. Check before launching new background work or scheduling a competing task.

## Deploy

Hosted on Vercel (`jobcopilot.vercel.app`). Read `docs/DEPLOY.md` before any deploy advice. **Don't run deploys from this session** without explicit user confirmation.

## CI / verification

**There is no `.github/workflows/` directory.** Vercel catches build failures on push; `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm -F @jobcopilot/prompts eval` are **local-only** gates. Run them before pushing anything portfolio-visible. The prompt eval is especially load-bearing — a regression there ships silently.

## RLS / data

Supabase RLS policies live in `packages/db` and are version-controlled. **Schema and policy changes are coupled** — `db:push` + `apply:policies` must run together. Don't edit policies in the Supabase dashboard; they'll drift.

## Stack discipline

- Tailwind + shadcn/ui for components — use existing primitives, don't introduce new component libraries. shadcn config is at `apps/web/components.json`; add components via `pnpm dlx shadcn-ui@latest add <name>` from the `apps/web/` dir.
- Zod schemas in `packages/shared` are the contract between client and server. Edit there, not at call sites.
