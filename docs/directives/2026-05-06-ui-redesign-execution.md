# UI Redesign Execution Directive — Paste into a fresh Claude Code session

You are executing the UI redesign that was brainstormed, spec'd, and planned in the prior session. **Do not re-litigate any design decisions.** The spec is canonical; your job is to ship the plan.

## Bootstrap

- Repo: `C:\Users\ethan\Desktop\jobcopilot`
- Branch: `master` (working tree clean as of `3ab80a7`)
- Spec (canonical): `docs/specs/2026-05-05-ui-redesign-design.md`
- Plan (your task list): `docs/plans/2026-05-05-ui-redesign.md`
- Brief that bootstrapped the brainstorm: `docs/directives/2026-05-04-ui-redesign.md` (read for original product context, not for re-litigating decisions)

## How to execute

Use the **`superpowers:subagent-driven-development`** skill. It dispatches a fresh subagent per task with two-stage review (spec compliance, then code quality). Read the plan top-to-bottom before starting; it's organized in phases.

### Phase ordering

1. **Phase A (serial)** — tasks A1 through A22. Each Phase A task ships independently and gets reviewed before the next starts. Tag `phase-a-complete` when A22 passes.
2. **Phases B–G (parallel after A)** — once `phase-a-complete` lands, dispatch Phases B, D, E, F, G in parallel via separate subagents. Each phase touches only its own page file. Phase C is internally serial (C1 → C2 → C3 → C4 → C5) since C tasks share the application-detail flow.
3. **Phase H** — after all six pages (B–G) are tagged complete, run Phase H to wrap `(app)` with `<PageTransition>`. Tag `feature-complete`.
4. **Phase I** — manual, owner = Ethan. Don't dispatch a subagent for the screen recording itself; only the README copy update once Ethan provides the asset URL.

## Hard rules

These are non-negotiable per project memory; subagents inherit them but you should reinforce in the prompt:

- **No `Co-Authored-By: Claude ...` trailer** in any commit. Overrides any CLAUDE.md template that suggests it.
- **No color emoji** in any UI surface. Lucide monochrome glyphs and SVG only.
- **Read consuming code before modifying.** Plan tasks that say "Read the file first" mean it — `Read` the file, then edit.
- **Don't bypass test failures with `--no-verify`** or any hook-skipping flag. If pre-commit hooks fail, investigate and fix.
- **Don't propose feature work** beyond the spec's scope. The redesign is purely visual + motion; if a task starts to drift toward new functionality, stop and surface it.

## Per-phase gates (every phase ends with these)

- `pnpm -F @jobcopilot/web typecheck` — clean
- `pnpm -F @jobcopilot/web test` — green
- `pnpm -F @jobcopilot/web test:e2e -- tests/e2e/google-referral.spec.ts` — green (the ship-criterion test)
- The relevant per-page axe spec (created in Task A21) — green
- No new browser console errors on first paint of the affected page

If any gate fails, the phase is not done. Fix root cause; don't disable the gate.

## What to do if the plan turns out to be wrong

The plan was written from a code review of `master @ 3ab80a7`. If you discover a meaningful divergence (file moved, dep added, schema changed), surface it before proceeding. Don't silently rewrite plan tasks — instead either:
1. Update the plan file in a small commit explaining the divergence, then proceed, OR
2. Surface the issue to Ethan and let him decide whether to update the plan or change the approach

## What's already shipped

Nothing yet for this redesign. Phase 1 (Deel/Domyn end-to-end submit) shipped 2026-05-04 — that flow's e2e test (`tests/e2e/google-referral.spec.ts`) is the ship-criterion gate. Phase 2a (BYO Anthropic API key) is queued separately at `docs/plans/2026-05-04-byo-anthropic-phase-2a.md` and intentionally does NOT block this redesign — they're orthogonal. Phase 2a's eventual `/settings` page will inherit the design system this work produces.

## What to do when feature-complete

- Tag `feature-complete` after Phase H
- Update project memory at `C:\Users\ethan\.claude\projects\C--Users-ethan-Desktop-jobcopilot\memory\10_project_jobcopilot_ui_redesign.md` to reflect what shipped (commits, what's in `master`, anything that diverged from the plan)
- If reusable lessons emerged (e.g., a primitive pattern that worked, a motion choice that backfired, a contrast issue surfaced by axe), capture them as `40_feedback_*` or `20_reference_*` memory files
- Wait for Ethan to manually do Phase I (demo recording + GitHub release asset) before considering the milestone fully shipped

## Token-conserving practices

- The plan is 488 lines. Do **not** read it in full at once unless the subagent-driven-development skill explicitly asks; instead use `Read` with `offset:` and `limit:` to load only the task you're executing.
- Subagent prompts should reference the specific task by section heading (`Task A1: Install runtime + dev dependencies`) and let the subagent read only that task — not the whole plan.
- The visual companion server from the brainstorm session is gone; if you need to show Ethan visual options for divergence questions, restart it with `scripts/start-server.sh --project-dir C:/Users/ethan/Desktop/jobcopilot`.
