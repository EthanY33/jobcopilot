# Job Hunt Copilot — Design Spec

**Date:** 2026-04-14
**Status:** Draft (brainstormed, pending review)
**Working name:** `JobCopilot` (placeholder — rename before productization)
**Owner:** Ethan Yucetepe (personal use now, productizable later)

---

## 1. Vision

A personal job-hunt copilot that collapses the time-per-application from ~45 min to ~5 min without sacrificing quality. AI drafts every piece of a job application (cover letter, free-text answers, resume bullet tweaks), the human reviews and submits. A Chrome extension handles form autofill on real ATS pages. A web app is the HQ for tracker, resume variants, application history, and (later) job discovery watchers.

Built first for Ethan's own Dec 2026 grad job hunt. Architected from day 1 to be multi-tenant so it can be productized (SaaS, $15–25/mo) post-hire.

**Non-vision:** Not a bulk auto-apply spammer. Not a LinkedIn scraper. Not a recruiter-side ATS.

## 2. Target User

**Primary (v1):** CS/engineering students and early-career engineers applying to 30–100 roles over a 2–4 month window. Technical enough to install a Chrome extension. Cares about quality-per-application, not volume.

**Secondary (post-productize):** Job seekers at any level who are applying through standard ATSes (Greenhouse, Lever, Ashby, Workday, iCIMS) and want AI-assisted drafting + tracking.

## 3. Prior Art / Differentiation

| Product | Approach | How JobCopilot differs |
|---------|----------|-------------------------|
| **Simplify.jobs** | Autofill extension + one-click apply on Greenhouse/Lever | Simplify uses stored static answers; we AI-draft per-application. Simplify submits on click (detection risk); we keep human review + submit. |
| **Jobright** | AI matching + resume tailoring, free tier | Jobright focuses on discovery-first, tailoring is thin. We focus drafting-first with deeper per-application tailoring. |
| **Huntr** | Pure kanban tracker (no AI) | Huntr has no drafting or extension autofill. We are tracker + AI + extension as one product. |
| **LazyApply** | Fully automated bulk apply (paid) | LazyApply is detection-bait and low-quality. We are explicitly anti-that — review-gated, quality-first. |
| **Sonara** | Done-for-you bulk apply (paid) | Sonara is concierge-style bulk spray. We put the user in the loop on every application. |
| **Teal** | Tracker + resume builder + Chrome extension | Teal's extension is save-job-only, no drafting. Their AI tailoring is manual resume-builder UI, not per-application drafted packages. |

**Wedge:** *"Copilot-quality applications at extension-speed."* The combination of (a) per-application AI drafting grounded on the user's resume + voice, (b) browser extension that writes into real ATS forms, (c) human-in-the-loop submission, and (d) early-career focus (Greenhouse/Lever-heavy portfolio) is the gap. Competitors pick at most 2 of those 4.

## 4. Scope

### In scope

- Web app: auth, profile, resume variants, kanban tracker, AI drafter, application history
- Chrome MV3 extension: ATS page detection, form autofill from reviewed drafts, sync back to web app
- Claude-powered drafting: cover letters, free-text answers, resume bullet suggestions
- Paste-URL → AI-extract job posting → create tracker entry
- Public-ATS JSON watchers (Phase 3): Greenhouse/Lever/Ashby company boards
- Match scoring: Claude rates job vs. user profile (Phase 3)

### Out of scope

- Auto-submit. Human always clicks Submit.
- LinkedIn/Indeed scraping (ToS, detection, brand risk).
- Bulk/spray applications.
- Interview scheduling automation (parking lot).
- Recruiter-side or employer-side features.
- Mobile apps.

## 5. Phases

Phases are ordered and gated by ship criteria. No timeboxes.

### Phase 1 · Web App MVP

**Deliverables:**
- Next.js 14 (App Router) + TypeScript + Supabase + Prisma + Claude API
- OAuth login (Google, GitHub)
- User profile: base resume (upload PDF + parse), skills, target role types, location preferences
- Named resume variants (e.g., "AI/ML focus", "Data Science focus")
- Paste job URL → server fetches page → Claude extracts title/company/location/requirements → create tracker entry
- Kanban tracker: columns for Wishlist → Applied → Phone Screen → Onsite → Offer → Rejected → Ghosted
- AI cover letter drafter: picks variant, generates ~250-word letter grounded on job + resume, user edits in place
- Resume bullet suggester: for each bullet in selected variant, Claude proposes a role-tailored rewrite, diff view
- Application detail page with notes, contacts, follow-up dates

**Ship criterion:** Ethan applies to the Google YouTube referral through the tool end-to-end — profile loaded, variant picked, cover letter drafted + edited in-app, resume tailored, application logged in tracker.

### Phase 2 · Chrome Extension

**Deliverables:**
- Chrome MV3 extension, shared types with web app
- Detects pages on: Greenhouse (boards.greenhouse.io/*, *.greenhouse.io), Lever (jobs.lever.co/*), Ashby (jobs.ashbyhq.com/*), Workday (*.myworkdayjobs.com/*), iCIMS
- Floating "Draft with JobCopilot" action button injected into job detail pages
- Reads DOM to extract job posting text (fallback: user highlights)
- Auth flow: `chrome.identity.launchWebAuthFlow` → Supabase OAuth PKCE → access + refresh tokens stored in `chrome.storage.local` (encrypted by Chrome)
- Pulls user profile + resume variants from web app API via Bearer access token (JWT); Supabase validates on each request
- Claude drafts application in background → extension opens side panel with drafted answers
- User reviews/edits each field in the side panel → extension types answers into the real form fields
- Human clicks the real Submit button (never the extension)
- Posts application event back to web app → tracker entry auto-created

**Ship criterion:** Complete a real application via the extension in under 5 minutes from opening the job page to clicking Submit.

### Phase 3 · Discovery Watchers

**Deliverables:**
- User adds target companies (e.g., Datadog, Stripe, Anthropic)
- Scheduled cron worker polls public ATS JSON endpoints:
  - Greenhouse: `boards-api.greenhouse.io/v1/boards/{token}/jobs`
  - Lever: `api.lever.co/v0/postings/{company}?mode=json`
  - Ashby: `api.ashbyhq.com/posting-api/job-board/{company}`
- Diffs new postings against last known state → new job events
- Match-scoring: Claude rates job vs. user profile with tiered label (`strong_fit` / `possible_fit` / `weak_fit`) + one-line rationale
- Daily email digest: top matches (all `strong_fit` + up to 10 `possible_fit`), one-click "Draft application" CTA per match
- Special watcher: Datadog cycle opens early Sept 2026 — auto-alerts user when target reqs drop

**Cron topology:**
- Default: **Supabase Edge Functions** triggered by `pg_cron` (no Vercel Cron runtime/invocation limits; closer to DB so writes are cheap)
- Fallback if scale demands: Vercel Cron enqueues jobs to Upstash QStash → worker processes with 5-min timeout per job
- Per-company rate limit enforced at the worker layer (max 1 poll / company / day)

**Ship criterion:** User receives a daily email digest of `strong_fit` matches (zero obviously-off-target roles), at least 3 new `strong_fit` or `possible_fit` matches per week on average.

### Phase 4 · Productize

**Deliverables:**
- Stripe billing: free tier (limited apps/mo), paid tier ($15–25/mo unlimited)
- Multi-tenant data isolation audit
- Marketing landing page
- Onboarding flow for new users (upload resume → profile bootstrap in <2 min)
- Chrome Web Store submission + review
- Referral program

**Ship criterion:** First paying user who is not Ethan.

## 6. Architecture

### Repos

- **`jobcopilot/` (new repo, separate from tidewane-build)**
  - `apps/web` — Next.js 14 app
  - `apps/extension` — Chrome MV3 extension
  - `packages/shared` — shared TypeScript types, Zod schemas, Claude prompt templates
  - `packages/db` — Prisma schema + generated client
- pnpm workspaces + Turborepo

### Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 14 App Router | Ethan's existing ATS capstone stack; React Server Components make data fetching clean |
| Language | TypeScript | End-to-end types between web + extension via shared package |
| DB | Supabase (Postgres) | Auth + DB + storage in one; row-level security for multi-tenant isolation |
| ORM | Prisma | Existing familiarity; strong typings |
| Auth | Supabase Auth (Google, GitHub OAuth) | Zero config |
| Extension auth | `chrome.identity.launchWebAuthFlow` + Supabase OAuth PKCE | Standard Chrome-to-OAuth pattern; no long-lived static keys |
| AI | Claude API (Anthropic SDK) | Primary drafting model: Sonnet 4.6. Complex reasoning (match-scoring, resume rewrites): Opus 4.6. **Prompt caching enabled on base resume + profile context.** |
| Hosting | Vercel (web) | Native Next.js + Cron support |
| Cron / scheduled jobs | Supabase Edge Functions + `pg_cron` | Avoids Vercel Cron invocation/timeout caps for Phase 3 watchers |
| Extension | Chrome MV3, Manifest V3 | Ethan shipped PrivacyPulse MV3 — known territory |
| Styling | Tailwind + shadcn/ui | Fast ship, clean defaults; matches his Next.js capstone |
| State (web) | Server Components + TanStack Query for client-side | Standard Next.js 14 patterns |
| State (extension) | Zustand + `chrome.storage.local` | Small surface; persists tokens + draft packages |

### Multi-tenancy

From day 1, every table has `user_id` + RLS policy, so Phase 4 productization is a billing/marketing lift, not a data-model rewrite. The policies protect the Supabase Data API only. The web app reads and writes through Prisma as the postgres role, which bypasses RLS, so per-user isolation in the app depends on every handler filtering by `userId`.

### Extension ↔ Web API auth (concrete)

1. First run: extension calls `chrome.identity.launchWebAuthFlow` pointed at `https://<supabase-url>/auth/v1/authorize?provider=google&...` with PKCE challenge
2. Supabase redirects back to extension redirect URL with auth code
3. Extension exchanges code for access + refresh token → stored in `chrome.storage.local`
4. All web API calls from extension: `Authorization: Bearer <access_token>`
5. Web API validates the user's JWT with the Supabase client (`auth.getUser()`); data access goes through Prisma, which bypasses RLS, so each handler must scope queries by `userId`
6. On 401: refresh token flow silently; if refresh fails, re-prompt auth

## 7. Data Model

```
User
  id, email, name, avatar_url, created_at
  → profile (1:1)
  → resume_variants (1:many)
  → applications (1:many)
  → target_companies (1:many)

Profile
  user_id, base_resume_text, skills[], target_roles[], target_locations[],
  linkedin_url, github_url, portfolio_url, phone, authorized_to_work_us
  → resume_variants (1:many)

ResumeVariant
  id, user_id, profile_id, name, bullets[] (JSON — per section),
  emphasis_keywords[], created_at, updated_at

JobPosting
  id, source_url, source_ats (greenhouse|lever|ashby|workday|icims|manual),
  company, title, location, requirements[], description, raw_html,
  discovered_at, posted_at (if extractable)

Application
  id, user_id, job_posting_id, resume_variant_id,
  status (wishlist|applied|phone_screen|onsite|offer|rejected|ghosted),
  applied_at, last_activity_at, follow_up_at,
  notes, contacts[] (JSON),
  current_cover_letter_id, current_answers_id   -- points to latest DraftedContent

DraftedContent
  id, application_id, kind (cover_letter|free_text_answer|resume_bullets),
  version (int, 1-indexed),
  parent_draft_id (FK → DraftedContent.id, nullable — null for v1)
  original_prompt_inputs (JSON), ai_draft, user_edited, finalized,
  created_at, finalized_at

  -- Invariant: for a given (application_id, kind), versions are strictly
  -- increasing integers. Regenerating creates a new row with version = prev+1
  -- and parent_draft_id = prev.id. "Latest" = max(version) in group.

TargetCompany
  id, user_id, name, ats_type, ats_board_token, last_polled_at, active

DiscoveryEvent (Phase 3)
  id, user_id, target_company_id, job_posting_id,
  match_tier (strong_fit|possible_fit|weak_fit),
  match_rationale, digest_sent_at
```

All tables have `user_id` where applicable + RLS enforcing `user_id = auth.uid()` for Data API access. Prisma bypasses RLS, so handler-level `userId` filters are the control for app requests.

## 8. Core Flows

### Flow A — Add application from URL (Phase 1)

1. User pastes URL in web app
2. Server fetches page HTML
3. Claude extracts: company, title, location, requirements, description
4. Create `JobPosting` if not exists (dedupe by URL)
5. Create `Application` in `wishlist` state linked to user + posting
6. User opens application detail → picks resume variant → hits "Draft cover letter"

### Flow B — Draft cover letter (Phase 1)

1. User selects application + resume variant
2. Server call to Claude with structured prompt:
   - System: "You are a career writing assistant..."
   - Cached block: base resume + profile context
   - Variable block: this job's posting + variant's emphasis
3. Claude returns ~250-word cover letter + 3 alternate openings
4. Save as `DraftedContent` row with `version = prev+1`, `parent_draft_id = prev.id`
5. UI: editable cover letter panel with "Regenerate" (creates new version) and "Alternate openings" buttons; "Revert to v2" dropdown for history
6. User edits → saves → finalizes (locks `finalized = true`, sets `Application.current_cover_letter_id`)

### Flow C — Apply via extension (Phase 2)

1. User browses to a Greenhouse/Lever/etc. job page
2. Extension detects known ATS via URL + DOM markers → injects "Draft with JobCopilot" floating button
3. On first run (or expired token): extension runs `chrome.identity.launchWebAuthFlow` → Supabase PKCE auth → tokens saved
4. User clicks button → extension reads job text → POSTs to `/api/draft` with `Authorization: Bearer <access_token>` → server returns draft package (cover letter + free-text answers + field-to-answer mapping)
5. Extension opens side panel with draft preview
6. User reviews/edits each field in side panel
7. On "Fill form" → extension types answers into real form fields (human-readable cadence, not instant)
8. User clicks the real page's Submit button
9. Extension detects submit → POSTs confirmation event → `Application` status → `applied`

### Flow D — Discovery digest (Phase 3)

1. `pg_cron` fires daily at 07:00 user-local → invokes Supabase Edge Function
2. Function iterates active `TargetCompany` rows; for each, hits public ATS JSON endpoint (rate-limited to 1/day)
3. Diffs against last seen → new jobs → create `JobPosting` + `DiscoveryEvent`
4. Batch call Claude (5–10 postings/call) to score each new posting against user profile → `match_tier` + one-line rationale
5. Top matches (all `strong_fit` + up to 10 `possible_fit`) → render email (React Email) → send via Resend
6. Email links jump to web app "Drafting" view for each role

## 9. AI Prompt Architecture

**Prompt caching is mandatory.** Base resume + profile + variant emphasis are the cached prefix; per-application specifics are the variable suffix. This cuts cost by ~80% at Ethan's application volume.

### Cached prefix (per session)

- System: role description, tone guardrails, anti-patterns to avoid ("no buzzword salad, no 'passionate about'")
- User context: full base resume text, skills, target roles, writing voice examples

### Variable suffix (per call)

- Specific job posting text
- Selected resume variant's emphasis keywords
- Any user-provided overrides ("focus on X", "mention Y")

### Prompt categories

1. **Cover letter drafting** — Sonnet 4.6, temperature 0.7
2. **Resume bullet rewriting** — Opus 4.6, temperature 0.3 (precision matters)
3. **Free-text answer drafting** — Sonnet 4.6, temperature 0.5
4. **Job posting extraction** — Sonnet 4.6, JSON-structured output
5. **Match scoring** — Sonnet 4.6, batched 5–10 per call, JSON output with enum field `match_tier`

## 10. Legal / Ethical Guardrails

- Extension never submits forms autonomously. The human clicks the real submit button.
- Form-fill uses human-readable typing cadence — the user IS filling the form (they reviewed every answer); the cadence reflects that rather than tripping overzealous bot-detection heuristics.
- No scraping of gated/authenticated sites (LinkedIn, Indeed). Only user-provided URLs and public ATS JSON endpoints.
- Respect `robots.txt` on any company-site polling.
- Rate-limit watchers: 1 request per company per day max.
- User data: resume + profile lives in user's row, never used to train/share. Encrypted at rest via Supabase.
- Clear ToS + privacy policy before any non-Ethan user onboards.

## 11. UI/UX Direction

Dark-mode native. Tailwind + shadcn/ui defaults as baseline, gradually add personality as the product matures. Palette choice is a Phase 1 task — do NOT inherit TideWane's underwater palette (wrong connotations for a career tool). Parking-lotted candidates: deep indigo + amber accent, or charcoal + teal.

Key screens:

- **Dashboard** — pipeline summary (count per status), upcoming follow-ups, recent activity
- **Kanban tracker** — drag-between-columns, card shows company + role + logo + last activity age
- **Application detail** — tabbed: Overview | Cover letter | Resume | Answers | Contacts | Timeline
- **Drafter modal** — cover letter editor with AI panel on right (regenerate, alternates, tone slider, version history)
- **Profile / Resume Variants** — side-by-side variant comparison
- **Discovery digest** — mobile-friendly email layout, one "Draft" CTA per role

Extension side panel matches web app aesthetic but denser.

## 12. Testing Strategy

| Layer | Tool | What it covers |
|-------|------|----------------|
| **Unit** | Vitest | Pure functions: prompt builders, diff logic, Zod schema validators, version-incrementing rules |
| **Integration** | Vitest + Supabase test project | DB access, RLS policies, Claude client (mocked via recorded fixtures) |
| **E2E web** | Playwright | Full web flows — auth, paste URL → draft → save, kanban drag, application detail |
| **E2E extension** | Playwright with persistent Chrome context loading unpacked extension | Flow C end-to-end on a local test ATS page (served from fixtures) |
| **Prompt evals** | Custom offline harness (`packages/prompts/evals`) | Labeled input/output pairs per prompt category; run on every prompt template change; reports drift |

**CI:** GitHub Actions — unit + integration on every PR, E2E on merge to `main`, prompt evals triggered only when prompts change.

**Prompt eval harness:** 20–30 fixture job postings with expected draft qualities (length, key phrases required, banned phrases). Claude scores new drafts against rubric; regression if score drops >10% vs. baseline.

**No hand-testing as ship gate.** Phase 1 ship criterion requires Ethan uses it for the Google referral — that's the acceptance test. But regression protection is automated.

## 13. Open Questions / Parking Lot

- **Naming.** `JobCopilot` is a placeholder. Real name decided before Phase 4.
- **Cover letter voice calibration.** How does the user teach the system their voice? Upload 2–3 of their past cover letters as training examples? Iterative "regenerate with more of X"?
- **Resume PDF parsing.** Use Claude's file input for initial parse. Fallback: user can hand-edit the parsed structured data.
- **Rate limits.** Claude API quota budgeting at ~100 apps/month for Ethan — estimate ~$15/mo in API costs with caching.
- **Interview scheduling.** Parking lot — Gmail/Calendar integration for Phase 5 or later.
- **Referral tracking.** How to mark a specific app as "via referral from X" for stats. Minor — Phase 1 `contacts` field covers it.
- **Company logos.** Clearbit's logo API or similar for auto-fetching company icons in tracker cards.
- **UI palette final call.** Decide before Phase 1 starts; parking-lotted candidates listed in Section 11.

## 14. Success Metrics (personal use)

- Median time-to-apply: baseline ~45 min → target ≤5 min after Phase 2 ships
- Application quality (self-assessed): each application feels at least as tailored as if manually written
- Tracker completeness: 100% of real applications logged, including any submitted outside the extension (manual entry ≤30 sec)
- Phase 1 directly enables the Google YouTube referral submission

## 15. Success Metrics (productization — Phase 4)

- First paying user who is not Ethan within 60 days of Phase 4 launch
- ≥70% of applications drafted via tool result in submission (no abandonment)
- Net promoter score ≥40 from first 20 users

---

*End of spec. Next step after approval: invoke `superpowers:writing-plans` to produce the Phase 1 implementation plan.*
