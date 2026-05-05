# Phase 2a Directive — Paste into a fresh Claude Code session

You are executing **Phase 2a (BYO Anthropic only)** for JobCopilot. The spec and plan already exist and have been reviewed. Your job is to drive execution via subagent-driven-development.

End-state: replace the shared `ANTHROPIC_API_KEY` env var with per-user BYO Anthropic keys held in browser localStorage and sent as request headers. After this ships, Ethan switches to his own free Gemini key (in Phase 2b) and the app's marginal AI cost goes to $0.

## Bootstrap

- Repo: `C:\Users\ethan\Desktop\jobcopilot`
- Branch: `master`, working tree should be clean — verify with `git status` before starting
- Latest commit at brief-write time: `6ef5348`
- Phase 1 SHIPPED 2026-05-04 — Ethan submitted a real application to Deel/Domyn through the app
- Phase 1.5 polish landed (commit `729dfe2`) — tab `forceMount` fix, whole-card drag, Opus → Sonnet on bullets

## The plan (read this first, in full)

`docs/plans/2026-05-04-byo-anthropic-phase-2a.md` — 13 tasks, ~1500 lines, TDD where applicable, exact file paths and code per step. Includes self-review and two-stage subagent review per task.

The plan was amended at commit `03b8ce9` to bake `stream()` into Task 3's `lib/ai.ts` adapter from day one. Wiring streaming into the cover-letter and bullet-suggester UIs stays deferred to Phase 2b — read Task 3's "Why streaming is in Phase 2a" preamble for the reasoning.

## The spec (read on-demand)

`docs/specs/2026-05-04-byo-multi-provider-ai-design.md` — full Phase 2a / 2b / 2c design. Phase 2a is the slice you're shipping; 2b (multi-provider) and 2c (free-tier durability) come later.

## Skills you must use

1. **`superpowers:subagent-driven-development`** — primary execution model. Fresh subagent per task + two-stage review (spec compliance, then code quality) per task. Mark each task complete before moving on.

2. **Subagents follow `superpowers:test-driven-development`** for the lib/* tasks (TDD steps are already written into the plan).

3. **`superpowers:finishing-a-development-branch`** at the end — after all 13 tasks ship and the manual smoke matrix in Task 13 passes.

Don't invoke brainstorming — the design has been brainstormed and approved. Don't invoke writing-plans — the plan exists.

## Hard rules (from project memory — non-negotiable)

- **No `Co-Authored-By: Claude ...` trailer in commits.** Use plain commit messages.
- Name is **"Ethan Yucetepe"** — plain ASCII, no umlaut.
- **$0 cost.** Use Upstash Redis free tier for rate-limiting (or Vercel KV — same underlying free Redis). Don't sign up for any paid service.
- **No `git add .` or `git add -A`.** Use explicit paths to avoid sweeping in env files or unintended changes.
- **Don't commit `.env*` files.** They're gitignored. If `git status` shows one staged, abort the commit.
- **Verify in browser** for UI-touching tasks (Settings page, banner). Type-checking and tests verify code correctness, not UX.

## Manual prerequisites Ethan needs to do (Task 1 Step 1)

The plan's Task 1 Step 1 requires a free Upstash Redis database. Ethan creates it in the Upstash console and pastes two env vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) into `apps/web/.env.local` and root `.env`. Ask him to do this before dispatching the Task 1 subagent (or guide him through it as part of the first subagent dispatch).

## Coordinating with the parallel UI redesign

A parallel UI redesign work stream may be active in another session — see `docs/directives/2026-05-04-ui-redesign.md`. Potential conflict points:

- **`apps/web/src/components/app-shell.tsx`** — Phase 2a Task 8 modifies it (adds Settings nav link + API-key banner). Redesign may also be touching this file. Check `git log` before editing; if redesign just landed an app-shell rewrite, your Task 8 needs to integrate into the new layout, not the old one.
- **`apps/web/src/app/(app)/settings/page.tsx`** — Phase 2a Task 7 creates it. Redesign should adopt the new design system here from day one if it's already shipped, otherwise build with current shadcn primitives and let redesign re-skin later.
- **AI feature components** (`cover-letter-drafter.tsx`, `bullet-suggester.tsx`) — Phase 2a Task 10 modifies them (disable buttons + inject key headers). Redesign may rewrite their visual structure. Coordinate via git: rebase on top of redesign commits if they land first.

If the redesign is meaningfully ahead of you, **pause and let it land first**, then resume. Phase 2a doesn't have an external deadline; the cleaner move is sequential.

If you're meaningfully ahead, the redesign session can rebase your changes when it picks up.

## Token-conserving practices

- Use `Read` with `limit:` and `offset:` for large files (the Phase 1 plan is 5173 lines — never read it in full). The Phase 2a plan is also long; read by task.
- Use `Grep` for searches, not Bash `cat`/`grep`/`rg`.
- Use `Glob` for file discovery.
- **Dispatch fresh subagents per task** — that's the whole point of subagent-driven-development. Don't carry implementation context in the controller; let each subagent be self-contained from its prompt.
- The plan's task texts are self-contained — when dispatching a subagent for Task N, paste Task N's full text into the subagent prompt rather than telling it to "read the plan" (subagent then doesn't burn tokens reading 1500 lines to find the part it needs).
- Verify with `pnpm -F @jobcopilot/web typecheck` and `pnpm -F @jobcopilot/web test` between tasks; don't run `pnpm test:e2e` between every task (it's slow and the plan only requires it at the smoke gate).

## Acceptance criteria (from the plan's "Definition of done")

Phase 2a ships when:

1. All 13 tasks have green checkmarks.
2. Manual smoke matrix in Task 13 passes every row.
3. `pnpm -F @jobcopilot/web typecheck` and `pnpm -F @jobcopilot/web test` both pass clean.
4. No `ANTHROPIC_API_KEY` references remain in any env file, deploy config, or grep'able code (except the test mock at `apps/web/src/app/api/test-mock/anthropic-mock/v1/messages/route.ts`, which is non-prod gated).
5. The next deploy goes out and Ethan, on his own browser, can paste his Anthropic key in `/settings` and use all four AI features end-to-end.

## When you're done

Update project memory at `C:\Users\ethan\.claude\projects\C--Users-ethan-Desktop-goneidle\memory\` to reflect Phase 2a shipped. The relevant project file is `10_project_jobcopilot_phase1.md` — append a "Phase 2a shipped" section with commits + the new component layer (`lib/ai.ts`, `lib/ai-key.ts`, `lib/ai-client.ts`, `lib/rate-limit.ts`, `/settings`, `/api/ai/verify`).

If Phase 2a surfaces lessons worth keeping (Vercel AI SDK patterns that worked, Upstash gotchas, header-injection patterns for fetch helpers), capture them as `20_feedback_*` or `20_reference_*` memories so future-Ethan or future-you benefits.

Then write the Phase 2b directive at `docs/directives/<date>-phase-2b-multi-provider.md` so the next session has the same self-contained handoff.
