# JobCopilot

Personal AI-assisted job application tool. See `docs/specs/2026-04-14-job-hunt-copilot-design.md` for the design spec and `docs/plans/` for implementation plans.

## Development

```bash
pnpm install
cp .env.example .env    # fill in secrets
pnpm -F @jobcopilot/db prisma migrate dev
pnpm dev
```

## Monorepo layout

- `apps/web` — Next.js 14 web app
- `packages/db` — Prisma schema + Supabase RLS policies
- `packages/shared` — shared types + Zod schemas
- `packages/prompts` — Claude prompt templates + eval harness
