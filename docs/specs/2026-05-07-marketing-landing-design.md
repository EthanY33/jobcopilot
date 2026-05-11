# JobCopilot Marketing Landing — Design Spec

**Status:** Approved 2026-05-07 · open questions resolved 2026-05-07 (§10) · ready for `writing-plans` (Phase I retarget — Claude-built marketing landing replaces Arcade interactive demo)
**Author:** Ethan Yucetepe (with Claude as scribe)
**Brainstorm session:** 2026-05-07 (visual companion + 11-iteration live prototype)
**Locked prototype:** `.superpowers/brainstorm/4273-1778192382/content/hero-prototype-v11.html` (gitignored — preserved as the source of truth for the visual; this spec is authoritative for behavior + structure)
**Branch at brief-write time:** `master` @ `a125d2c`

---

## 1. Goal

Build a fully-rendered marketing landing page for JobCopilot in the territory of Anthropic / OpenAI / Linear / Lovable / Cluely / Cursor homepages. Cinematic energy primary, indie-hacker manifesto undertone secondary. The page is the entry point for visitors arriving from GitHub, README, or external links — it explains the product, shows the actual UI, makes the personal/open-source nature explicit, and routes engaged visitors into the app.

This **breaks** the original 2026-05-04 UI redesign lock that said "Domain: app-only. No marketing landing page." User explicitly accepted breaking that constraint when picking scope option C in the 2026-05-07 brainstorm. The earlier Phase I plan (MP4 demo on GitHub release → Arcade interactive demo) is fully superseded by this spec.

**Out of scope:**
- Custom domain (still uses the existing Vercel deploy URL)
- Paid hosting / paid third-party tools — $0 cost rule still holds
- Replacing any of the existing six app routes' visual design (those already shipped in the UI redesign)
- New product features
- Video production, recorded MP4s, Arcade or Supademo subscriptions
- A/B testing infrastructure
- Email capture / newsletter signup / analytics

---

## 2. Approved direction

| Decision | Outcome |
|---|---|
| **Scope** | Full marketing landing page (~6 sections including footer). Breaks the prior "no marketing landing" lock. |
| **Style energy** | Cinematic + manifesto blend — primary feel is OpenAI/Anthropic homepage cinematic restraint, with an indie-hacker undertone via the eyebrow ("A personal tool. Open source. Free."), top utility bar, GitHub-star ghost CTA, and the Manifesto section. |
| **Hero centerpiece** | Flat-facing browser-chrome frame with subtle ±2deg mouse parallax centered on 0deg. Two ambient drift orbs (violet top-right, azure bottom-left) breathing slowly. The frame contains a live, scripted demo of the application drafter that cycles through three tabs every 4.5s. |
| **Page rhythm** | Hero → How It Works → Tracker Pipeline → Manifesto → Final CTA → Footer. No section eyebrows / numbering — section titles do the work alone. |
| **Where it lives** | **Resolved (§10.1):** replaces `/` (root). Middleware redirects authed users on `/` to `/dashboard`; unauth visitors render the marketing page. |
| **Auth handling** | **Resolved (§10.2):** unauth on `/` → marketing landing; authed on `/` → 302 to `/dashboard`. All other `(app)` route auth flows unchanged (still redirect unauth → `/login`). |
| **README integration** | **Resolved (§10.3):** brand-hero SVG embed stays; add a single line beneath it linking to the deployed marketing URL ("Watch the live landing →"). Preview screenshot section stays as-is. |
| **Hosting** | Same Vercel free-tier deploy as the existing app. No new infrastructure. |

---

## 3. Visual identity (inherited from UI redesign + new locks)

### Brand tokens (unchanged from 2026-05-05 spec)
- `--brand-violet: 258 90% 60%`
- `--brand-azure: 215 95% 50%`
- Gradient: `linear-gradient(135deg, hsl(258 90% 60%), hsl(215 95% 50%))`
- Background: `#08080c` (page-wide)
- Surface: `#0d0d12` (frames, cards, footer)
- Border: `#25252e` / `#1f1f28` (depth-tiered)
- Body text: `#f4f4f8` primary, `#b4b4c4` secondary, `#8a8a99` tertiary, `#6a6a7a` quaternary, `#4a4a55` quietest

### New status accents (introduced for the kanban in §6)
- Wishlist: `hsl(220 15% 50%)` → `hsl(220 15% 35%)` gradient (muted gray-blue)
- Applied: `hsl(258 90% 60%)` → `hsl(258 90% 45%)` (brand violet)
- Phone screen: `hsl(215 95% 60%)` → `hsl(215 95% 40%)` (brand azure)
- Onsite: `hsl(258 90% 60%)` → `hsl(215 95% 50%)` (brand gradient — full)
- Offer: `hsl(140 70% 60%)` → `hsl(140 70% 40%)` (success green — same hue as the existing `live` indicator in the hero status row)

### Typography system (locked through 5 iterations of user pushback)

| Use | Family | Weight | Size | Notes |
|---|---|---|---|---|
| Hero h1 | Geist | 700 | `clamp(48px, 8vw, 96px)` | line-height .95, letter-spacing -.035em |
| Section h2 | Geist | 700 | `clamp(44px, 6.5vw, 76px)` | line-height 1.02, letter-spacing -.035em |
| Final CTA h2 | Geist | 700 | `clamp(40px, 6vw, 68px)` | line-height 1.02 |
| Step / card titles | Geist | 600 | 22-24px | letter-spacing -.015em to -.02em |
| Body / step desc | Source Serif 4 | 400 | 16-19px | line-height 1.6-1.7, letter-spacing -.005em |
| Manifesto body | Source Serif 4 | 400 | 21px | larger to read as "personal letter" weight |
| AI demo output (cover letter, Q&A answers, resume bullet text) | Source Serif 4 | 400 | 16px | renders as authored prose, NOT mono |
| URL bars, eyebrow, status row, pane labels, sidebar section, top utility bar, stats labels, kanban column labels, footer meta | Geist Mono | 400-500 | 9-12px | system / metadata voice |
| Card meta / timestamps | Geist Mono | 400 | 9-10px | uppercase, letter-spacing .08-.18em |
| CTAs / buttons | Geist | 600 | 14px | |
| Lede pills (`cover letter`, `resume bullets`, `free text question`) | Geist Mono | 400 | 13px | violet-tinted bg + border, inline in serif lede |

**Source Serif 4 for AI prose was the breakthrough decision** — five iterations on the hero font system landed there. Mono kept reading as "terminal log / JSON dump"; serif reads as "authored words." This matches Anthropic's Claude UI which uses serif for AI replies. **Don't re-litigate this.**

### Locked copy rules (carry forward to all future copy)
- **No section eyebrows** ("02 · HOW IT WORKS" style). Titles do the work alone.
- **No em-dashes** (`—`) in body copy. Restructure with periods.
- **No AI-startup buzzwords**. Banned: "context-aware", "ambient micro-interactions", "keeping the human in the loop", "intersection of X and Y", "generative AI tools that empower", "leverages", "synergy", and anything ChatGPT-overuses.
- **Word hyphens are fine** (`Full-Stack`, `open-source`, `free-text` is not — write it as two words).
- **Plain ASCII "resume"** — never `résumé`. (Inherited from the goneIdle plain-ASCII brand rule.)
- **Plain ASCII "Ethan Yucetepe"** for any author byline (inherited from same rule).

---

## 4. Page structure

```
┌─────────────────────────────────────────────────┐
│  Top utility bar (fixed, glass-blur)            │  48px
│  · "JOBCOPILOT · v1.0"     "github · ethan/..."  │
├─────────────────────────────────────────────────┤
│                                                 │
│              SECTION 01 · HERO                  │  100vh
│  · eyebrow "A personal tool..."                 │
│  · h1 "Stop writing applications."              │
│  · lede w/ 3 mono pills                         │
│  · 2 CTAs (primary + ghost)                     │
│  · Live tilted product frame                    │
│    └ tab cycle: Cover Letter → Resume → Answers │
│                                                 │
├─── (orb seam dissolved by bridge orb) ──────────┤
│                                                 │
│           SECTION 02 · HOW IT WORKS             │  ~140px padding × 2
│  · h2 "Three steps. No resume tinkering."       │
│  · 3-step grid (paste → draft → ship)           │
│    each w/ scripted mini-visual                 │
│                                                 │
├─── (orb seam) ──────────────────────────────────┤
│                                                 │
│         SECTION 03 · TRACKER PIPELINE           │  ~140px padding × 2
│  · h2 "Every application, in one view."         │
│  · stats strip (23 / 6 / 2)                     │
│  · Kanban frame (5 columns × ~9 cards)          │
│    w/ pulse animation on "just applied" card    │
│                                                 │
├─── (orb seam) ──────────────────────────────────┤
│                                                 │
│            SECTION 04 · MANIFESTO               │  ~180px padding top
│  · h2 "I built this for myself."                │
│  · 3 paragraphs Source Serif 4 @ 21px           │
│  · 4-up specs strip (Stack/Cost/License/Status) │
│  · Author byline (gradient avatar + handle)     │
│                                                 │
├─── (orb seam) ──────────────────────────────────┤
│                                                 │
│            SECTION 05 · FINAL CTA               │  ~140px padding × 2
│  · h2 "Ready to stop writing applications?"     │
│  · sub + 2 CTAs + fineprint                     │
│                                                 │
├─────────────────────────────────────────────────┤
│                FOOTER (4-column)                │  ~56px padding
│  · brand mark + tagline | Product | Source |    │
│    Made by                                      │
│  · bottom strip (mono meta)                     │
└─────────────────────────────────────────────────┘
```

---

## 5. Per-section design

### Section 01 — Hero

**Layout:** Centered single column inside a section with `min-height: 100vh; padding: 120px 32px 80px`. Content order from top: eyebrow → h1 (2 lines, "Stop writing" / "applications." with gradient on second line) → lede (max-width 640px, with three inline mono pills) → CTAs (gradient primary "Try the demo →" + ghost "★ Star on GitHub") → product frame.

**Stagger entrance:**
- Eyebrow: `fadeIn 1.2s` at `0.2s`
- H1: `rise 1.4s cubic-bezier(.2,.7,.2,1)` at `0.4s`
- Lede: `fadeIn 1s` at `0.9s`
- CTAs: `fadeIn 1s` at `1.2s`
- Product frame: `rise 1.4s cubic-bezier(.2,.7,.2,1)` at `1.4s`

**Ambient orbs:**
- Violet orb: 600×600px, `hsl(258 90% 60%)`, opacity .35, `top: -200px; right: -150px`, `drift1` 28s ease-in-out infinite
- Azure orb: 500×500px, `hsl(215 95% 50%)`, opacity .28, `bottom: -260px; left: -120px`, `drift2` 22s ease-in-out infinite (extends 260px below the section to bleed into the next section's bg — see §7)

**Product frame ("the live demo"):**
- Browser-chrome shell: 3 traffic-light dots + URL `jobcopilot.app/applications/3a904ba7` in mono
- Body: 220px sidebar (Workspace section header + 4 nav rows with real Lucide SVG icons: LayoutGrid/Trello/Copy/User mapping to Dashboard/Tracker/Resume Variants/Profile; **Tracker is the active row**) + main content area
- Main: meta line "GOOGLE · APPLICATIONS ENGINEER" (mono, violet) → h3 "Applications Engineer, YouTube Creator Partnerships" (Geist 600) → 5 tabs (Overview / **Cover Letter** / Resume / Answers / Timeline) with sliding gradient indicator → AI output stage → status row at bottom
- Tab cycle: every 4.5s the active tab advances Cover Letter → Resume → Answers and the indicator slides; the AI pane crossfades to the corresponding content; the status row's right side updates ("DRAFTING COVER LETTER" → "TAILORING RESUME BULLETS" → "ANSWERING FREE TEXT QUESTIONS")
- Mouse parallax: hovering over `.frame-stage` rotates the frame `rotateX(-y * 4deg) rotateY(x * 4deg)` where x,y are normalized -0.5..0.5; mouse leave returns to `transform: none` over 0.5s
- AI output panes: Source Serif 4 at 16px on a `rgba(8,8,12,.6)` panel. Min height 340px so all three panes have room without overlap. Each pane crossfades opacity + translateY 6px on tab change.
- Bullet style in the Resume pane: small 5px violet dots with 8px halo glow (NO triangle characters)
- Q&A pane: question prefixed with `Q · ` in mono; answer body in serif

**Hero copy (locked):**

> Eyebrow: `A personal tool. Open source. Free.`
>
> H1: `Stop writing` / `applications.` (second line gradient)
>
> Lede: `Paste a job posting. AI drafts the [cover letter], tailors your [resume bullets], and answers every [free text question]. You review, edit, and ship.` (brackets = mono pills)
>
> CTA primary: `Try the demo →` · CTA ghost: `★ Star on GitHub`

**AI demo content (locked, all in Source Serif 4 prose):**

- Cover letter: *"Dear YouTube Creator Partnerships team, I'd love to join the team building tools for creators. The work you're doing is exactly the kind of thing I've been focused on for the past year. I think I'd bring real momentum on day one [cursor]"*
- Resume: pane label "Resume bullets · tailored to posting" then 3 dotted bullets:
  1. *"Built and shipped JobCopilot, an open source tool that uses Claude to draft job applications end to end."*
  2. *"Designed a resume variant system. One source of truth, multiple tailored versions per posting."*
  3. *"Deployed on Vercel and Supabase free tiers. Under $5 a month, full accessibility. [cursor]"*
- Answers: 2 Q&A pairs:
  1. Q: *"Why are you interested in this role?"* — A: *"Creator tooling is one of the most leveraged places to apply AI right now. You ship into a real audience that benefits from every percent of friction removed, and I want to work on that surface."*
  2. Q: *"Tell us about a relevant project."* — A: *"JobCopilot. An open source app that drafts every piece of a job application using Claude. Running on free tiers. Source on GitHub [cursor]"*

### Section 02 — How It Works

**Layout:** Centered, `padding: 160px 32px 160px`, `max-width: 1100px`. Heading block (h2 + serif sub) → 3-step grid (`grid-cols-3, gap: 48px`).

**Heading copy:**
> H2: `Three steps. No resume tinkering.` (gradient on second clause)
> Sub: `JobCopilot reads the posting, drafts every piece against your resume, then tracks the outcome. You stay in the loop. You just stop writing the boring parts.`

**Each step:**
- 64×64 circular gradient number badge with double-ring shadow + violet glow drop
- Title (Geist 600 24px) + serif description
- Visual frame (110px min-height, glass-blur backdrop, hover-lifts with violet glow)

**Step visuals (all scripted CSS animations):**
- **01 Paste** — mock URL input field "boards.greenhouse.io/google/jobs/..." + gradient "Extract + create →" button
- **02 Draft** — mini serif AI output line ("Dear team, the role's emphasis on AI tooling for creators aligns with [mini-cursor]") with the typing cursor
- **03 Ship** — 3-column kanban (Wishlist/Drafting/Applied) with the Drafting card glowing bright then fading dim, and the Applied card popping in with scale-bounce + brighter glow on a 6s loop using `cubic-bezier(.4,0,.2,1)` with a graceful crossfade-reset window (80-100%) so the loop boundary never visually "teleports"

**Connecting line under the step numbers:** thin 1px horizontal gradient (transparent → violet/azure → transparent), positioned at `top: 32px` from the steps grid start.

**Scroll-reveal:** Heading + each step has `data-reveal`; IntersectionObserver toggles `.visible` at threshold 0.15. Steps stagger via `transition-delay: .15s, .3s` on 2nd/3rd children.

**Section-specific orbs:**
- Bridge orb at top: 560×560 azure, opacity .22, `top: -280px; left: 35%` — overlaps the hero's bottom orb to dissolve the seam
- Lower-left violet: 460×460, opacity .22, `top: 18%; left: -160px`
- Lower-right azure: 420×420, opacity .18, `bottom: -120px; right: -140px`

### Section 03 — Tracker Pipeline

**Layout:** Centered, `padding: 160px 32px 160px`, `max-width: 1200px` (wider than other sections to give the kanban room). Heading block → stats strip → kanban frame.

**Heading copy:**
> H2: `Every application, in one view.` (gradient on second clause)
> Sub: `Drag cards to update status. Click any card to jump back to the drafts. Wishlist, applied, screens, offers. All in one place.`

**Stats strip:** 3 stats centered with 56px gap. `38px Geist 700 number / mono uppercase label`. Numbers: `23` applications · `6` phone screens · gradient `2` offers.

**Kanban frame:**
- Browser-chrome shell with URL `jobcopilot.app/tracker`
- Body: `grid-cols-5, gap: 14px`, 5 columns each with `min-height: 320px`
- Each column: head row (mono uppercase label + count pill) + body container (rounded `rgba(8,8,12,.5)` with a 2px gradient accent bar at the top, color-coded per status — see §3 status accents)
- Column labels and count pills inherit the column's accent color

**Application cards (10 total):**
| Column | Card | Avatar gradient |
|---|---|---|
| Wishlist | Anthropic — Member of Technical Staff, Applied AI | A · `#d97757 → #c2410c` |
| Wishlist | Linear — Senior Product Engineer | L · `#5e6ad2 → #3a3f7a` |
| Wishlist | Figma — Design Engineer, Editor Surface | F · `#f24e1e → #a259ff` |
| Applied (recent, pulses) | Google — Applications Engineer, YouTube Creator Partnerships | G · `#4285f4 → #34a853` |
| Applied | Stripe — Software Engineer, Payments Platform | S · `#635bff → #3a32a3` |
| Applied | Vercel — Full-Stack Engineer, Next.js | V · `#fff → #888` (black text) |
| Phone screen | Notion — Product Engineer, AI Surface | N · `#f4f4f8 → #aaa` (black text) |
| Phone screen | Cursor — Engineer, Inference Quality | C · `#1a1a1a → #555` |
| Onsite | Supabase — Full-Stack Engineer, Auth | S · `#3ecf8e → #1f7a5b` |
| Offer | Replicate — Founding Engineer, Inference | R · brand gradient |

**Card structure:** top row [22×22 rounded-square avatar | mono small-caps company] → title (Geist 500 13px, **2-line clamp via -webkit-line-clamp**) → bottom row [mono timestamp | colored status dot glowing in column accent color]

**"Just applied" pulse:** the Google card in Applied has `class="recent"` + 6s `recentPulse` keyframes (border + box-shadow inset glow on 0-35%, none on 65-100%).

**Section orbs:**
- Upper-right violet: 520×520, opacity .2, `top: 8%; right: -180px`
- Lower-left azure: 480×480, opacity .18, `bottom: 10%; left: -160px`

### Section 04 — Manifesto

**Layout:** Centered with **narrower** content `max-width: 720px` (other sections are 1100-1200px) — gives the manifesto a "personal letter" weight. `padding: 180px 32px 160px`. Left-aligned text inside the content column.

**Heading + body copy (locked):**
> H2: `I built this for myself.` (gradient on "for myself.")
>
> P1: `Job applications take hours. Most of that time goes to writing cover letters and tweaking resume bullets for postings I'd already read three times. I wanted that work done. Cleanly, with my voice, against my real resume.`
>
> P2: `So I built JobCopilot. It reads the posting, drafts every piece against my profile, and tracks the outcome.` *Claude does the writing. I review and ship.* (gradient highlight on second sentence)
>
> P3: `The whole thing runs on free tiers. The source is on GitHub. If you want it, fork it.`

**Specs strip (4 columns, 24px padding, glass-blur card below the body):**
| Label | Value |
|---|---|
| Stack | Next.js + Claude |
| Cost | Under $5/mo (gradient) |
| License | MIT |
| Status | Personal use |

**Author byline (top-border separator, 32px gap):** 44×44 brand-gradient circle avatar with "E" + author info column (Geist 600 14px name "Ethan Yucetepe" + mono 11px handle "@EthanY33 · github.com/EthanY33/jobcopilot")

**Section orbs:**
- Bridge orb at top: 540×540 violet, opacity .2, `top: -260px; left: 18%` — dissolves seam from Tracker section
- Lower-right azure: 420×420, opacity .15

### Section 05 — Final CTA

**Layout:** Centered, `padding: 140px 32px 140px`, `max-width: 800px`.

**Treatment:** Behind the content, a soft radial gradient ellipse (`800×500px, hsl(258 90% 60% / .18)`) at the section center for emphasis. One azure orb at the bottom-center for atmospheric continuation.

**Copy (locked):**
> H2: `Ready to stop writing applications?` (gradient on the entire second clause "stop writing applications?")
> Sub: `Try the demo. Or read the source. Free forever, runs on your Anthropic key, no marketing email.`
> CTAs: same primary + ghost as the hero
> Fineprint (mono, .25em letter-spacing): `Open source · MIT · v1.0`

### Footer

**Layout:** `padding: 56px 32px 40px`, top-border `rgba(255,255,255,.06)`, bg `rgba(8,8,12,.7)`. Inner `max-width: 1200px`, 4-column grid (`1.5fr 1fr 1fr 1fr`).

**Columns:**
1. **Brand:** 28px brand mark (small SVG approximation of the JobCopilot tile — gradient rounded square with a stylized orbit-ish glyph) + "job**copilot**" wordmark with gradient on "copilot" + tagline in serif: *"A personal tool that drafts every piece of a job application. Built by Ethan, open-sourced for everyone."*
2. **Product** column: links — `Try the demo`, `How it works`, `The pipeline` (all internal anchors)
3. **Source** column: links — `GitHub repo`, `README`, `Design spec`
4. **Made by** column: links — `Ethan Yucetepe`, `@EthanY33`, `Other projects`

**Bottom strip** (32px above-divider + 28px padding-top): mono uppercase 10px, justified — left "JOBCOPILOT v1.0 · MIT", right "Built with Next.js + Claude"

---

## 6. Animation language

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Drift orbs (all sections) | `translate + scale 1↔1.05-1.08` | 22-32s, varied per orb | `ease-in-out` infinite |
| Hero text stagger (eyebrow, h1, lede, CTAs, frame) | `fadeIn` / `rise` (translateY 24px → 0) | 1-1.4s, staggered | `cubic-bezier(.2,.7,.2,1)` |
| Hero tab cycle | crossfade pane (opacity + translateY 6px); slide indicator | .4s pane swap, .55s indicator slide | `cubic-bezier(.4,0,.2,1)` |
| Hero tab cycle interval | every 4.5s | — | `setInterval` |
| Mouse parallax on hero frame | `rotateX/Y ±2deg` based on cursor | .5s settle on leave | `cubic-bezier(.2,.7,.2,1)` |
| Cursor blink (in cover letter, resume, answers, draft mini-visual) | `opacity 1 ↔ 0` | 1s steps(2) | infinite |
| How It Works scroll-reveal | h2 + steps stagger up (`opacity + translateY 28px → 0`) | .9s, staggered .15s/.3s | `cubic-bezier(.2,.7,.2,1)` |
| Step 03 kanban "completed → applied" loop | dim/bright crossfade with scale bounce on Applied card | 6s, with crossfade-reset window 80-100% | `cubic-bezier(.4,0,.2,1)` |
| Tracker stats / kanban-frame scroll-reveal | translateY 16-28px → 0 | 1s with staggered delays | `cubic-bezier(.2,.7,.2,1)` |
| Recent-card pulse on "Just applied" Google card | border + box-shadow inset glow on 0-35%, none on 65-100% | 6s | `cubic-bezier(.4,0,.2,1)` |
| Card hover lift | translateY -1px + violet box-shadow | .25s | (default) |
| Manifesto + CTA scroll-reveal | translateY 20px → 0 | 1s | `cubic-bezier(.2,.7,.2,1)` |
| Custom scrollbar hover | thumb gradient opacity .45 → .75 + inset glow | .2s | (default) |

**Reduced motion:** the existing UI redesign already respects `@media (prefers-reduced-motion: reduce)` via the global token (set in `globals.css`). The marketing landing **must** respect the same preference: drift orbs freeze, scroll-reveal becomes instant (no translateY), tab cycle still advances but instantaneously (no crossfade), kanban pulse pauses. Implementation: gate all `animation` declarations behind a `@media (prefers-reduced-motion: no-preference)` block, or use the existing reduced-motion utilities already in the design system.

---

## 7. Background continuity (the seam-dissolve pattern)

Each section uses `overflow-x: clip; overflow-y: visible`. Horizontal overflow clips at the section boundary (keeps page centered on viewport); vertical overflow bleeds through to allow orbs to cross between sections.

Each section seam (Hero→How, How→Tracker, Tracker→Manifesto, Manifesto→CTA) has a **bridge orb** in the lower section, positioned with negative `top:` (e.g., `top: -280px`) so it overlaps the upper section's bottom orb. The blurred edges merge across the boundary, eliminating the perceptual "darker band" where one section ends and the next begins.

This is mandatory; without it, the page reads as a stack of separate cards rather than a single continuous starfield.

---

## 8. Component inventory

These are the React components that need to be built (or pulled from the existing design system) for the implementation phase. Naming uses the existing `apps/web/src/components/marketing/` namespace (new directory).

| Component | Status | Notes |
|---|---|---|
| `<MarketingLayout>` | NEW | Top utility bar + page wrapper. Hides the (app) sidebar. |
| `<MarketingPage>` | NEW | Composes all 6 sections in order. Lives at the chosen route (see §10). |
| `<UtilityBar>` | NEW | Fixed top bar. Brand left, GitHub link right. Mono. |
| `<HeroSection>` | NEW | Full hero composition. Internally renders `<HeroDemo>`. |
| `<HeroDemo>` | NEW | The tilted browser-chrome frame with the cycling tab demo. Self-contained, manages its own setInterval. |
| `<HowItWorksSection>` | NEW | Heading + 3-step grid. |
| `<HowStep>` | NEW | One step (number + title + desc + visual slot). Accepts visual as children. |
| `<PasteVisual>` / `<DraftVisual>` / `<ShipVisual>` | NEW | The 3 mini-visuals inside HowStep. |
| `<TrackerPipelineSection>` | NEW | Heading + stats strip + kanban frame. |
| `<KanbanPreview>` | NEW | The static kanban with 5 columns + 10 cards, NOT a dnd-kit reuse. Pure visual. |
| `<KanbanColumn>` (preview variant) | NEW | Different from the real `kanban-board.tsx` column — this is a visual-only variant with the colored top accent bar. |
| `<ApplicationCardPreview>` | NEW | Different from `application-card.tsx` — this is a static visual variant with the avatar + line-clamped title + status dot. |
| `<ManifestoSection>` | NEW | Heading + 3-paragraph body + specs strip + author byline. |
| `<FinalCTASection>` | NEW | Heading + sub + 2 buttons + fineprint. |
| `<MarketingFooter>` | NEW | 4-column footer + bottom strip. |
| `<DriftOrb>` | NEW | Reusable orb with `position: absolute`, configurable size/color/animation. Used 10+ times across the page. |
| `<ScrollReveal>` | NEW | Wrapper that toggles `.visible` via IntersectionObserver. Used 10+ times across sections. |
| `useMouseParallax` (hook) | NEW | For HeroDemo. Returns transform value based on cursor position. |

**Existing components to reuse:**
- `<Button>` (from existing UI redesign — gradient primary variant exists)
- Geist font registration (already done in `apps/web/src/app/layout.tsx`)
- Brand mark SVG (already at `docs/assets/jobcopilot-brand.svg` — but a lighter inline-SVG version is needed for the footer; OK to inline rather than import)
- Lucide icon imports (`LayoutGrid`, `Trello`, `Copy`, `User`) for the HeroDemo sidebar

**Source Serif 4 font:** needs to be added to the Next.js font registration alongside the existing Geist + Inter + JetBrains Mono. Use `next/font/google` Source Serif 4 with `subsets: ['latin']`, weights `[400, 500, 600]`, variable `--font-serif`.

---

## 9. Locked prototype reference

The full visual + behavior is locked at:
`.superpowers/brainstorm/4273-1778192382/content/hero-prototype-v11.html`

This file is gitignored (lives under `.superpowers/`). **Implementation must match its visual output pixel-for-pixel** for the locked sections. If the implementation deviates, treat the prototype as authoritative for visual decisions and this spec as authoritative for structural / behavioral decisions.

For convenience, the spec captures all key dimensions, easings, and copy verbatim above so future work can proceed without needing the prototype file. The prototype is preserved for visual diffing during implementation review.

---

## 10. Resolved decisions (formerly open questions)

Resolved 2026-05-07 prior to writing-plans. The recommendations from the brainstorm were accepted as-is.

1. **Where the page lives technically — RESOLVED: option (a) — replaces `/`.**
   - The marketing landing owns `/` (root). Authed users hitting `/` get a 302 to `/dashboard` via middleware. Rejected (b) "/landing" — the marketing page is the public face of the product, it should own the canonical URL.
   - Implementation note: requires either a new `apps/web/src/app/page.tsx` at the root that renders `<MarketingPage>`, or moving the existing root-route behavior. Verify how `/` is currently wired (likely a redirect to `/login` or `/dashboard`) and replace it with conditional render based on session.

2. **Auth handling — RESOLVED.** Current middleware in `apps/web/src/middleware.ts` redirects unauth → `/login` for any `(app)` route. New behavior:
   - Unauth visitor on `/` → render the marketing landing (no redirect)
   - Authed visitor on `/` → 302 to `/dashboard`
   - All other `(app)` route auth flows unchanged (still redirect unauth → `/login`)
   - Implementation note: middleware needs an explicit branch for the `/` route that checks the session cookie and redirects only when authed. The marketing page itself should be statically renderable with no session dependencies.

3. **README integration — RESOLVED: add one-line link, keep everything else.**
   - Brand-hero SVG embed at the top of README stays untouched
   - Add a single line directly below the brand hero: a "Watch the live landing →" anchor pointing at the deployed marketing URL (e.g., `https://jobcopilot-web.vercel.app/`)
   - The 6-screenshot Preview section stays as-is
   - Implementation note: this is the smallest README change possible — one inserted line, no section restructuring.

4. **Hosting — confirmed (no decision needed).** No new infrastructure. Existing Vercel free-tier deploy that already serves the app will serve the marketing route. Confirm at implementation time that the marketing page doesn't blow Vercel's free-tier function or bandwidth limits — it shouldn't (it's static-generated, no server-side data, just CSS animations).

5. **Brand hero SVG in the footer — implementation decision, not visual.** The footer brand mark is currently an inline SVG approximation. Better: import the existing `docs/assets/jobcopilot-brand.svg` brand mark or render a small version of the same `tileSvg` from `apps/web/scripts/build-brand-assets.ts`. Decide during component build.

---

## 11. Out of scope (deferred / explicitly not in this spec)

- Custom domain / DNS
- Email capture, mailing list, analytics
- A/B testing infrastructure
- Login/signup CTAs that aren't already in the existing app routes
- Replacing any of the six locked app routes' visual design
- Multi-language support, i18n
- Server-rendered marketing data (the page is fully static — no DB queries, no API calls)
- Mobile-specific layout adjustments beyond what `clamp()` and grid `1fr` provide naturally; tablet/mobile is a follow-up if it doesn't read well at narrow widths

---

## 12. Acceptance criteria

The implementation is "done" when:

- All 6 sections render in the locked order (Hero → How It Works → Tracker → Manifesto → Final CTA → Footer)
- Visual matches the v11 prototype: typography, colors, spacing, animations, scroll-reveal behavior all preserved
- Tab cycle in HeroDemo advances every 4.5s, status row label updates in sync
- Mouse parallax on HeroDemo works (rotates ±2deg from flat)
- Kanban "completed → applied" loop in How It Works section 03 runs smoothly with no teleport-snap at loop boundary
- "Just applied" pulse on the Google card in Tracker Pipeline runs on a 6s loop
- Scroll-reveal triggers on all sections
- Background continuity: no visible "black line" at section seams; orbs bleed naturally
- All copy matches the locked text verbatim (no em-dashes, no AI-buzzwords, plain ASCII "resume", "Ethan Yucetepe")
- Custom scrollbar renders (gradient violet→azure thumb, brightens on hover)
- Source Serif 4 loads cleanly from `next/font/google` (no FOUT in production)
- Page passes the existing axe tests (or adds a new `axe.marketing.spec.ts` that's green) — color-contrast on all text/bg pairs, all interactive elements have accessible names, no role mismatches
- Page works in dark mode (default — the page IS dark-mode-only by design; no light-mode variant needed for this version)
- `prefers-reduced-motion: reduce` respected — all infinite animations pause/freeze
- Page is statically renderable (no `useEffect` blocks rendering, no SSR mismatches)
- Lighthouse Performance score ≥ 85 mobile (animations may push it down; acceptable as long as Largest Contentful Paint and CLS pass)
- New `axe.marketing.spec.ts` passing
- Existing 14/14 vitest unit tests still passing
- Existing 6 axe e2e specs (dashboard, tracker, application, variants, profile, login) still passing — implementation must NOT regress any locked app route
- Hero brand wordmark renders identical to the brand-hero SVG (Geist Bold lowercase "jobcopilot" with "copilot" gradient-filled, -.025em letter-spacing) — visual continuity with the README brand hero

---

## 13. Implementation order recommendation (for the plan phase)

1. **Foundation:** `<DriftOrb>`, `<ScrollReveal>`, `useMouseParallax`, Source Serif 4 font registration, `<MarketingLayout>` with utility bar + global background CSS
2. **Hero:** `<HeroSection>` + `<HeroDemo>` (the most complex and most-visible piece — get this right first)
3. **How It Works:** `<HowItWorksSection>` + `<HowStep>` + the 3 mini-visuals
4. **Tracker Pipeline:** `<TrackerPipelineSection>` + `<KanbanPreview>` + `<ApplicationCardPreview>`
5. **Manifesto + CTA + Footer:** simpler sections, can land together
6. **Routing + middleware:** wire up `/` to render the page; redirect authed → `/dashboard`
7. **a11y + perf pass:** axe spec, reduced-motion gating, Lighthouse audit

---

**End of spec.**
