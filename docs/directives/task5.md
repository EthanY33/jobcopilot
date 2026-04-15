# Task 5 Directive — Paste into a fresh Claude Code session

Continue JobCopilot Phase 1 implementation using subagent-driven-development.

Repo: `C:\Users\ethan\Desktop\jobcopilot` (branch: `master`, working tree clean)
Plan: `docs\plans\2026-04-14-job-hunt-copilot-phase1.md`
Spec: `docs\specs\2026-04-14-job-hunt-copilot-design.md`

Tasks 1–4 are done and committed on master. Pick up **Task 5 only** — `apps/web` Next.js scaffold + Tailwind + shadcn. Task 5 is a scaffold task with 13 steps; do it as one subagent-driven-development cycle.

Use `superpowers:subagent-driven-development`. For this task: dispatch implementer (sonnet is fine — mechanical), then spec reviewer, then `superpowers:code-reviewer` agent. Fix all findings, re-review until clean. Commit on master. No worktree needed (solo dev, fresh repo).

## Key context for Task 5

- The plan was recently synced with shipped code. `apps/web/package.json` in the plan now pins `@anthropic-ai/sdk ^0.89.0` (not `^0.30.0`) — **do not regress** this to the old version.
- `apps/web` depends on all three workspace packages via `workspace:*`: `@jobcopilot/shared`, `@jobcopilot/db`, `@jobcopilot/prompts`. All are live.
- The plan's Step 9 (`src/app/page.tsx`) imports from `@/lib/supabase/server`, which is created in **Task 6**. `pnpm dev` at Step 12 will hit a module-not-found for `@/lib/supabase/server`. The plan's own acceptance says: "Hitting http://localhost:3000 will error (no supabase client yet) — that's fine; we're just confirming Next builds." So the expected state after Step 12 is: **Next dev server starts, page compilation fails at the missing Supabase import**. Do NOT add a placeholder stub just to make it green — leave the import and have the implementer report exactly what Next logged.
- This task does NOT run CI. Ship criterion is: dev server starts on port 3000 and Next builds (module-resolution error on the page load is expected).
- Windows path note: bash shell works. The `rm -rf`, `find`, destructive git operations still require approval per the hook.

## Important infrastructure already in place (do NOT change)

- Root `.env` is the single source of truth — fully populated with Supabase + Anthropic creds. `.env` is gitignored at any depth.
- `dotenv-cli` at workspace root; existing packages use `dotenv -e ../../.env -- <cmd>` where env is needed. apps/web will read env at runtime via Next.js's built-in loader — Task 5 scaffold doesn't need env wiring. Task 6 is where Supabase env vars get read.
- pnpm v10 with `pnpm.onlyBuiltDependencies` allowlist in root `package.json` — leave it alone. `next` / `tailwindcss` / etc. have no native build steps so they don't need allowlisting, but `sharp` (transitive via Next.js) sometimes does. If pnpm install warns about a package wanting a build script, add it to the allowlist rather than bypassing.
- Supabase project `mobvniaknhnthlrvadiu` (us-west-2) is provisioned. 8 tables + 11 RLS policies live. Do NOT re-run migrations or `db push`.

## Recent commit context

```
6a460ea docs(plan): sync Task 3/4 with shipped code; bump Task 5 SDK pin
c8a3b2d fix(prompts): tighten parsers and types per code review
d6e3d3e fix(prompts): bump anthropic SDK to unlock base cache_control + document block; revert workarounds
ab8c020 feat(prompts): claude prompt builders + eval harness
79d39aa fix(shared): address code review (tighten Contact, readonly statuses, tuple openings, derive AtsSource)
5e81736 feat(shared): types + zod schemas
f380ffb chore(db): use dotenv-cli to load root .env; remove duplicate
```

## Manual steps the user (Ethan) handles, NOT the subagents

- Anything requiring Supabase dashboard or external service config (OAuth setup is in Task 7 — defer to user when reached).
- API key creation (already done for Anthropic).

## Divergences to watch for (learned from Tasks 3 and 4)

1. **The plan may prescribe exact code that doesn't typecheck under strict TS.** If the implementer hits a strict-mode error on verbatim plan code, they should report `DONE_WITH_CONCERNS` with the specific error rather than silently refactor. Adjudicate whether a plan amendment is warranted (as happened with the SDK version bump and `MessageCreateParamsNonStreaming` in Task 4).
2. **The plan may prescribe a dep version that's stale.** `next@14.2.5` was current as of the plan's writing but may not be by the time Task 5 executes. If `pnpm install` fails to resolve or tests fail inexplicably, check whether a minor version bump (not a major) resolves it. Record the bump in the implementer report.
3. **shadcn components aren't installed by the scaffold** — Task 5 only sets up `components.json`, Tailwind, the globals CSS, and the Next.js shell. No `src/components/ui/*` files. That's correct — components get added in later tasks as needed via `pnpm dlx shadcn-ui@latest add <component>`.
4. **Turborepo `transpilePackages` in `next.config.mjs`** lists the three workspace packages. If any package has its own `main`/`exports` setup that Next can't resolve, that's where debugging starts.

## Stop condition

Stop after Task 5 is committed clean (reviewer approves with no open Critical/Important findings). Don't start Task 6 unless told.

## Report back

When done:
- The new commit SHA on master
- A one-paragraph summary of what was scaffolded
- Any deviations from the plan (including any dep version bumps) with the reason
- Any reviewer findings that were deferred as tech-debt (label + reason)
