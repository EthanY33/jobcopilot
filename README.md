# JobCopilot

Personal AI-assisted job application tool. AI drafts every piece of an application (cover letter, resume bullet tweaks, free-text answers); the human reviews and submits. See `docs/specs/2026-04-14-job-hunt-copilot-design.md` for the full design.

## Stack

Next.js 14 · TypeScript · Supabase · Prisma · Claude API · Tailwind + shadcn/ui · Vitest + Playwright.

## Development

Prerequisites: Node 20 LTS, pnpm 10, Supabase project (URL + anon + service-role keys), Anthropic API key.

```bash
pnpm install
cp .env.example .env                    # fill in Supabase + Anthropic keys
pnpm -F @jobcopilot/db db:push          # push schema to Supabase
pnpm -F @jobcopilot/db apply:policies   # apply RLS policies
pnpm dev                                # starts apps/web on :3000
```

Sign in with Google or GitHub.

## Monorepo layout

- `apps/web` — Next.js 14 web app
- `packages/db` — Prisma schema + Supabase RLS policies
- `packages/shared` — shared types + Zod schemas
- `packages/prompts` — Claude prompt templates + eval harness

## Tests

```bash
pnpm test                          # unit + integration (vitest)
pnpm test:e2e                      # playwright e2e (requires dev server)
pnpm -F @jobcopilot/prompts eval   # prompt regression harness
```

## Deploy

See `docs/DEPLOY.md`.
