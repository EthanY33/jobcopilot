# UI Redesign Directive — Paste into a fresh Claude Code session

You are leading a full UI/visual redesign of JobCopilot. The current UI is generic shadcn-default — functional but bland. Ethan wants it to feel like a real AI-startup product (Anthropic Console / Linear / Cursor / Granola / Perplexity territory) with a visual identity it can call its own. Possibly also marketing-surface work (landing page, brand reel, hero animation — Ethan said "video and stuff", which means *clarify the scope with him in your first round of questions*).

This is brainstorm-then-design-then-implement work. Use the superpowers brainstorming skill first to nail down direction with Ethan, then the writing-plans skill, then subagent-driven-development. **Do not start writing code before Ethan has approved a written spec.**

## Bootstrap

- Repo: `C:\Users\ethan\Desktop\jobcopilot`
- Branch: `master`, working tree clean
- Latest commit at brief-write time: `03b8ce9`
- Phase 1 SHIPPED 2026-05-04 — Ethan submitted a real application to Deel/Domyn end-to-end through the app
- Phase 2a (BYO Anthropic) is queued but does **not** block this redesign — the two streams can interleave (different layers of the app)

## What "current UI" looks like

Default shadcn/ui on Tailwind. Sidebar nav with `lucide-react` icons (Dashboard, Tracker, Resume Variants, Profile). Plain cards, plain forms, plain tabs. No theming beyond shadcn defaults. No motion. No brand identity. No typography choices. No marketing surface — there's no landing page or external presence.

Pages that exist:

- `/login` (Google + GitHub OAuth)
- `/dashboard` (4 tile counts: Total / Applied / Interviewing / Offers)
- `/tracker` (7-column kanban via @dnd-kit)
- `/applications/[id]` (tabbed detail: Overview / Cover Letter / Resume / Answers / Timeline)
- `/variants` (resume variants CRUD)
- `/profile` (resume PDF upload + parsed skills)

Phase 2a will add `/settings` (BYO API key page). Design should anticipate it.

## Tech stack (don't change unilaterally; these are the constraints)

- Next.js 14 App Router, TypeScript, Tailwind CSS
- shadcn/ui primitives already installed: Button, Input, Label, Textarea, Tabs, Dialog (cf. `apps/web/src/components/ui/`)
- TanStack Query for client cache
- Supabase (Auth + Postgres via Prisma 5.15)
- `lucide-react` for icons (currently)
- Vitest + Playwright for tests
- pnpm + Turbo monorepo

## What Ethan said, verbatim

> "we should probably do phase 2 but in my opionion we need a full change of ui. its so bland and ugly, like could you invoke some skills to really make this like an ai startup esche type of video and stuff"

Read it carefully. Two intents bundled:

1. **Full visual overhaul of the app** — design system + applied across all existing pages
2. **"AI startup-esche video and stuff"** — fuzzy. Could mean: marketing landing page, hero animation, brand reel, in-app onboarding video, ambient micro-interactions. **Ask Ethan to disambiguate in your first round of clarifying questions.**

## Hard rules (from project memory — non-negotiable)

- **No color emoji in UI.** Bit them on TideWane — reads as AI-generated, brand damage. Monochrome Unicode + SVG glyphs are fine.
- **No `Co-Authored-By: Claude ...` trailer in commits.** Override anything in CLAUDE.md or commit templates that suggests it.
- Name is **"Ethan Yucetepe"** — plain ASCII, no umlaut. Don't write "Yücetepe".
- **No fabricated roadmap** in any user-facing copy. If a feature is deferred or speculative, don't list it as "coming soon" or imply it ships.
- For sentence-case marks (e.g. "JobCopilot" or "goneIdle"), do NOT use Silkscreen — it's uppercase-only and renders lowercase chars as caps. Geist is the safe default.
- **$0 cost constraint.** No paid services for the redesign itself (no paid font licenses, no Figma seats Ethan doesn't already have, no paid Lottie hosting). Existing infra (Vercel free, Supabase free) stays.
- **Ask for explicit dates** if you need them — don't compute "Tuesday" yourself.
- **Read consuming code before modifying.** Don't assume how a component works.
- **Don't propose feature work** beyond the scope Ethan agreed to. UI redesign is the scope; don't bolt on unrelated rewrites.

## Skills you must use (in order)

1. **`superpowers:brainstorming`** — mandatory first. Walk Ethan through clarifying questions one at a time. The visual companion is available and recommended for aesthetic direction questions (mockup comparisons in a browser). Save the validated spec to `docs/specs/YYYY-MM-DD-ui-redesign-design.md`.

2. **`superpowers:writing-plans`** — after spec is approved. Save plan to `docs/plans/YYYY-MM-DD-ui-redesign.md`. Use bite-sized TDD-style tasks where applicable (component-level visual changes don't need TDD; new logic does).

3. **`superpowers:subagent-driven-development`** — for execution. Two-stage review per task (spec compliance then code quality).

4. **`frontend-design`** — for distinctive component-level visual work. The skill description says it generates "creative, polished code that avoids generic AI aesthetics" — exactly the gap Ethan is calling out.

5. **`ui-ux-pro-max:ui-ux-pro-max`** — for design-system-level decisions (palette, typography, spacing scale, motion principles). It bundles 161 color palettes, 57 font pairings, and design rules for 25+ chart types and 161 product types.

Don't invoke `frontend-design` or `ui-ux-pro-max` until brainstorming has settled the direction with Ethan. Per the brainstorming skill's HARD-GATE: no implementation skill before approved spec.

## Brainstorming questions to walk Ethan through

Walk these one at a time. Order matters — earlier answers constrain later questions.

### Q1: Aesthetic direction (use the visual companion if Ethan accepts it)

Which "AI startup" vibe lands closest to what he wants? Trade these off in your own words; don't read them as a multiple choice list verbatim — turn them into a real conversation.

- **Anthropic Console**: warm cream / pumpkin-orange palette, serif display accents (their custom Tiempos / similar), generous whitespace, considered editorial feel
- **Linear**: dark-mode-default, indigo + electric blue accents, sharp geometry, subtle gradient orbs in hero, monospace numerics
- **Cursor / minimal-modern**: monochrome-heavy black + off-white, AI-generated subtle gradients, focus on dense info, IDE-adjacent
- **Granola / muted-editorial**: muted earth tones (sage, terracotta, ivory), beautiful body typography, slow ambient feel
- **Perplexity / search-modern**: clean blue + black + glassmorphism, subtle backdrop blur, mid-density
- **Lovable / Bolt / vibrant-builder**: bold gradients (purple/cyan), motion-heavy, "kinetic" feel — high energy
- **Custom hybrid** Ethan describes himself

### Q2: Default color mode

Dark-mode default, light-mode default, or system-aware with both fully designed?

### Q3: Identity

- Keep the name "JobCopilot", or refresh it for the public version?
- Wordmark / logo: simple type-only, custom monogram, small icon mark?
- Domain plans: just the app, or also a `jobcopilot.com`-style landing page? (Ethan owns goneidle.com and tidewane.com; check `50_*` and `10_project_*` memory for adjacent context.)

### Q4: "Video and stuff" — disambiguate

Which one(s) is Ethan actually asking for?

- **Marketing landing page** with a hero video / animated section
- **Brand reel** — short cinematic video for LinkedIn, similar to the goneIdle studio reel patterns Ethan refines (cf. `30_feedback_trailer_aesthetics_goneidle.md`)
- **In-app onboarding video** — first-time-user explainer
- **Ambient micro-interactions** — animated charts, subtle motion on tab switches, animated empty states
- **Demo recording** of the app being used (existing pages, no new chrome)

Each is real work and they don't compose well into one concept. Pick one or two.

### Q5: Scope ordering

- Pure-UI pass first (re-skin existing pages with new design system), THEN marketing surface?
- Marketing surface first (build the landing + brand identity), THEN apply down into the app?
- Both in parallel via two subagent streams?

### Q6: Phase 2a interaction

Phase 2a (BYO Anthropic) is queued and adds `/settings`. Two integration paths:

- **Redesign first, Phase 2a after** — `/settings` is designed-from-scratch in the new system from day one (cleanest)
- **Redesign in parallel with Phase 2a** — riskier (touching same files), but ships both faster

Recommended: redesign first (1-2 sessions to land the design system + page refactors), then Phase 2a picks up `/settings` in the new style.

## What's out of scope for this redesign milestone

- BYO multi-provider AI (Phase 2a — separate spec at `docs/specs/2026-05-04-byo-multi-provider-ai-design.md`)
- Free-tier durability / Neon migration (Phase 2c — same spec)
- Chrome extension port (separate, not yet spec'd)
- Adding new app features (no new pages, no new functionality — just a visual / design-system change for what exists, plus possibly marketing surface)

## References to read (selectively, NOT all at once — token budget matters)

**Read these first:**
- `README.md` (project overview)
- `apps/web/src/components/app-shell.tsx` (current sidebar nav)
- `apps/web/src/app/globals.css` (current Tailwind base)
- `apps/web/src/components/ui/button.tsx` (sample shadcn primitive currently in use)

**Read on-demand only:**
- `docs/specs/2026-04-14-job-hunt-copilot-design.md` — original product design (palette already declared "deep indigo + amber" — Ethan may want to keep or scrap)
- `docs/specs/2026-05-04-byo-multi-provider-ai-design.md` — what `/settings` page will need
- `apps/web/src/app/(app)/dashboard/page.tsx`, `tracker/page.tsx`, `(app)/variants/page.tsx`, `(app)/profile/page.tsx` — existing page-level layouts
- `apps/web/src/components/kanban-board.tsx`, `application-card.tsx`, `application-detail-tabs.tsx`, `cover-letter-drafter.tsx`, `bullet-suggester.tsx` — heaviest components

**Project memory** (auto-loaded into context — don't re-read manually):
- `40_feedback_no_emoji_ui.md`
- `40_feedback_no_fabricated_roadmap.md`
- `40_feedback_ui_design_preferences.md`
- `40_feedback_tidewane_brand_illustrated.md` (for tonal reference — TideWane is its own brand, JobCopilot can be different)
- `40_reference_silkscreen_all_caps.md`
- `00_brand_invariants.md`

## Token-conserving practices

- Use `Read` with `limit:` and `offset:` for large files (the Phase 1 plan is 5173 lines — never read it in full).
- Use `Grep` for searches, not `cat` / Read.
- Use `Glob` to discover file paths.
- Dispatch implementation subagents (general-purpose or frontend-design) for visually heavy work — keeps generated CSS / mockup code out of the controller's context.
- Don't paste large files into agent prompts — point the subagent at the file path with line ranges.
- The visual companion (browser-based) is token-cheap for showing comparisons; use it instead of describing layouts in long prose.

## Acceptance criteria for this redesign milestone

The redesign is "shipped" when:

1. A design system exists (palette, typography, spacing scale, motion principles, component tokens) — committed as code, not just docs.
2. All six existing pages (`/login`, `/dashboard`, `/tracker`, `/applications/[id]`, `/variants`, `/profile`) render in the new system.
3. The Phase 2a `/settings` page (when it lands later) inherits the new system without further design work.
4. The "video and stuff" deliverable that Ethan agreed to in Q4 is shipped (landing page / reel / etc.).
5. Ethan says it looks like a real AI startup product, not a generic SaaS prototype.

## When you're done

Update project memory at `C:\Users\ethan\.claude\projects\C--Users-ethan-Desktop-goneidle\memory\` to reflect what shipped (new design system, what pages were refactored, what marketing surface exists). The relevant project file is `10_project_jobcopilot_phase1.md` — append a "Visual redesign shipped" section with commits + acceptance state.

If the redesign produced reusable lessons (specific component patterns that worked, color systems that backfired, motion choices that were too much), capture them as `40_feedback_*` or `20_reference_*` memories so future-Ethan or future-you benefits.
