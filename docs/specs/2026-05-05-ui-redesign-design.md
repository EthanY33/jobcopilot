# JobCopilot UI Redesign — Design Spec

**Status:** Approved 2026-05-05 · ready for `writing-plans` (v2 — incorporates code-grounded review)
**Author:** Ethan Yucetepe (with Claude as scribe)
**Directive:** `docs/directives/2026-05-04-ui-redesign.md`
**Brainstorm session:** 2026-05-04 → 2026-05-05 (visual companion + 6-question walkthrough)
**Branch at brief-write time:** `master` @ `03b8ce9`

---

## 1. Goal

Replace the current default-shadcn-on-Tailwind UI with a distinctive visual identity in the territory of Anthropic Console / Linear / Cursor / Framer / Perplexity / Lovable — without changing functionality. The product currently feels like a generic SaaS prototype; the redesign should make it read as a real AI-startup product. Scope is purely visual + motion across the six existing pages, plus brand assets and a demo recording.

**Out of scope:** new features, new pages, new fields, new data, marketing landing page, custom domain, paid tooling. Strictly a re-skin and motion pass.

---

## 2. Approved direction (Q1–Q6 outcomes)

| Q | Decision |
|---|---|
| Q1 — Aesthetic | Framer × Perplexity × Lovable hybrid. Editorial type confidence, surgical use of bold gradient accents, glassmorphic surfaces. |
| Q2 — Color mode | System-aware, both modes first-class. Default to **dark on first visit**, expose `dark | light | system` via toggle, persist preference. |
| Q3a — Name | Keep "JobCopilot". |
| Q3b — Wordmark + mark | Lowercase Geist Bold "jobcopilot" with kerning B (`letter-spacing: -0.025em`); "copilot" portion gradient-filled. Mark: rounded-square gradient tile with two-body orbit cut through as negative space (knockout). |
| Q3c — Domain | App-only. No marketing landing page. No custom domain. |
| Q4 — Motion + video | Both ambient micro-interactions AND demo recording (post-redesign, for README/LinkedIn). |
| Q5 — Implementation order | Hybrid: minimal foundation first, then page-by-page. Priority: tracker → applications/[id] → dashboard → variants → profile → login. |
| Q6 — Phase 2a interaction | Redesign first, Phase 2a after. `/settings` inherits the new design system. |

---

## 3. Visual identity

### Wordmark

- Family: **Geist Bold (700)**
- Casing: all-lowercase `jobcopilot`
- Tracking: `letter-spacing: -0.025em` (kerning B). Cap at `-0.025em` even at display sizes — the b/c bowls collide at tighter values.
- Color: "job" inherits `--foreground`; "copilot" filled with `var(--gradient-brand)` via `background-clip: text`.
- 96px brand-hero usage is treated as inline (`text-[96px]`), not a type-scale entry — it's a brand element, not body type.

### Logo mark

A rounded-square tile with a two-body orbit cut through as negative space (knockout). Implementation: gradient-filled `<rect>` masked by an SVG `<mask>` that subtracts the orbit + two endpoint dots.

```svg
<defs>
  <linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%"   stop-color="hsl(var(--brand-violet))"/>
    <stop offset="100%" stop-color="hsl(var(--brand-azure))"/>
  </linearGradient>
  <mask id="brand-mask">
    <rect x="0" y="0" width="120" height="120" rx="26" fill="#fff"/>
    <g transform="rotate(-22 60 60)">
      <ellipse cx="60" cy="60" rx="34" ry="10" fill="none" stroke="#000" stroke-width="3.5"/>
      <circle cx="26" cy="60" r="10" fill="#000"/>
      <circle cx="94" cy="60" r="10" fill="#000"/>
    </g>
  </mask>
</defs>
<rect x="0" y="0" width="120" height="120" rx="26"
      fill="url(#brand-grad)" mask="url(#brand-mask)"/>
```

Single SVG works on both light and dark browser chrome (gradient on solid square, no transparency in the colored area).

### Lockup

`<Lockup />` composes `<Logo size />` + `<Wordmark size />`. Used in app-shell sidebar, login hero, OG image, README header.

---

## 4. Foundation — design tokens

### Color tokens (HSL-without-commas, shadcn-compatible)

`apps/web/src/app/globals.css` uses the shadcn convention: `:root` defines light defaults, `.dark` class overrides for dark. This aligns with the existing `tailwind.config.ts` `darkMode: ["class"]` setting.

```css
:root {
  /* light is the default; dark overrides via .dark class */
  --background: 38 35% 97%;       /* warm paper */
  --foreground: 240 23% 5%;
  --card: 0 0% 100%;
  --card-foreground: 240 23% 5%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 23% 5%;
  --primary: 258 90% 60%;
  --primary-foreground: 0 0% 100%;
  --secondary: 38 25% 92%;
  --secondary-foreground: 240 23% 5%;
  --muted: 38 25% 92%;
  --muted-foreground: 240 13% 32%;  /* ~5.5:1 on paper */
  --accent: 215 95% 50%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 80% 50%;
  --destructive-foreground: 0 0% 100%;
  --success: 156 73% 35%;
  --success-foreground: 156 5% 99%;
  --warning: 38 95% 45%;
  --warning-foreground: 38 50% 8%;
  --border: 240 8% 88%;
  --input: 240 8% 88%;
  --ring: 258 90% 60%;

  /* Brand extensions (not consumed by shadcn primitives) */
  --brand-violet: 258 90% 60%;
  --brand-azure: 215 95% 50%;
  --gradient-brand: linear-gradient(135deg, hsl(var(--brand-violet)), hsl(var(--brand-azure)));
}

.dark {
  --background: 240 23% 5%;
  --foreground: 240 14% 96%;
  --card: 240 17% 9%;
  --card-foreground: 240 14% 96%;
  --popover: 240 16% 11%;
  --popover-foreground: 240 14% 96%;
  --primary: 258 90% 66%;
  --primary-foreground: 0 0% 100%;
  --secondary: 240 13% 14%;
  --secondary-foreground: 240 14% 96%;
  --muted: 240 13% 14%;
  --muted-foreground: 240 10% 70%;
  --accent: 215 95% 56%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 75% 55%;
  --destructive-foreground: 0 0% 98%;
  --success: 156 73% 40%;
  --success-foreground: 156 5% 99%;
  --warning: 38 92% 50%;
  --warning-foreground: 38 50% 8%;
  --border: 240 14% 16%;
  --input: 240 14% 16%;
  --ring: 258 90% 66%;

  --brand-violet: 258 90% 66%;
  --brand-azure: 215 95% 56%;
  --gradient-brand: linear-gradient(135deg, hsl(var(--brand-violet)), hsl(var(--brand-azure)));
}
```

The brand gradient stops are mode-specific (lightness shift) so `var(--gradient-brand)` automatically adapts when the theme switches. Components consume the variable, never the computed gradient string.

### Tailwind config additions (`tailwind.config.ts`)

Phase A extends the existing config to expose new tokens as utility classes. Existing mappings stay; additions:

```ts
// theme.extend.colors:
success:  { DEFAULT: "hsl(var(--success))",  foreground: "hsl(var(--success-foreground))"  },
warning:  { DEFAULT: "hsl(var(--warning))",  foreground: "hsl(var(--warning-foreground))"  },

// theme.extend.fontFamily:
sans:    ["Inter", "system-ui", "sans-serif"],          // unchanged
display: ["Geist", "Inter", "sans-serif"],              // NEW
mono:    ["JetBrains Mono", "monospace"],               // unchanged

// theme.extend.borderRadius — backward-compatible additions:
sm:   "var(--radius-sm)",     /* 6px  — was calc(var(--radius) - 4px) */
md:   "calc(var(--radius) - 2px)",   /* 8px — unchanged */
lg:   "var(--radius)",        /* 10px — unchanged (existing rounded-lg keeps meaning) */
xl:   "var(--radius-xl)",     /* 22px — NEW: hero cards, modals */
tile: "var(--radius-tile)",   /* 26px — NEW: icon mark only */
```

Existing `rounded-lg` usages across the codebase keep meaning 10px — no migration needed.

### Typography

Three families loaded via `next/font/google` in `app/layout.tsx`. Phase A **removes** the existing `<link>` font tags at `app/layout.tsx:13-18` (Inter + JetBrains Mono — no Geist) and replaces them with `next/font` calls for all three families.

- **Geist** — display + UI prominence
- **Inter** — body
- **JetBrains Mono** — labels, eyebrows, numerics

```
display-xl  Geist 700  72px  -0.025em  line 1.0
display     Geist 700  56px  -0.025em  line 1.05
hero        Geist 700  40px  -0.025em  line 1.1
title       Geist 600  28px  -0.02em   line 1.25
heading     Geist 600  20px  -0.015em  line 1.35
body        Inter 400  15px   0        line 1.55
small       Inter 400  13px   0        line 1.5
label       JetBrains Mono 500  11px  0.12em  uppercase
mono-num    JetBrains Mono 500  inherit  font-feature-settings: "tnum"
```

96px Lockup uses `text-[96px]` inline — brand-element only, not body type.

### Spacing

Tailwind defaults (multiples of 4). No custom scale.

### Radius

```
--radius-sm:    6px   /* badges, pills, small inputs                  → rounded-sm  */
--radius:      10px   /* buttons, inputs, secondary cards (default)   → rounded-lg  */
--radius-xl:   22px   /* hero cards, modals                           → rounded-xl  */
--radius-tile: 26px   /* app icon mark only                           → rounded-tile */
```

### Motion

```
--ease:       200ms cubic-bezier(.2,.8,.2,1)    /* state changes */
--ease-quick: 120ms cubic-bezier(.2,.8,.2,1)    /* hovers */
--ease-page:  280ms cubic-bezier(.16,1,.3,1)    /* route transitions */
```

Principles:
- Stat counters: animate on **cold load only** via `sessionStorage.getItem('jobcopilot:dashboard_seen')`; instant on revisit.
- Route transitions: `framer-motion` (~7kb gzipped). View-Transitions API too new to depend on as default.
- Tracker drag preview: lift styling lives on the `<DragOverlay>` child, not the `useSortable` item (see Phase B).
- Empty-state gradient orbs: CSS keyframes on `transform`/`opacity` (GPU-accelerated). One instance per page, fixed to viewport.
- Hover: 120ms transform-only.
- `@media (prefers-reduced-motion: reduce)` fully honored: orbs hidden (not just shortened), animation/transition duration ≈ 0, counters skip their animate-from-0 path, badge pulses stop.

---

## 5. Components

### shadcn primitives in `apps/web/src/components/ui/`

**Existing — refactor only:**

- `Button` — add `gradient` variant via cva (`bg-[var(--gradient-brand)] text-white`). `default`/`outline`/`ghost` keep API.
- `Tabs` — keep the enclosing-bar structure (current `bg-secondary p-1` wrapper). Active trigger gets `data-[state=active]:bg-background data-[state=active]:text-foreground` (already there) PLUS a gradient underline via `relative` + `::after { content: ''; position: absolute; bottom: 0; left: 25%; right: 25%; height: 2px; background: var(--gradient-brand); opacity: 0; transition: opacity var(--ease-quick); }` and `data-[state=active]:after:opacity-100`. Subtle, gradient-y, doesn't break existing layouts.
- `Dialog` — content gets glass treatment: `bg-card/85 backdrop-blur-md rounded-xl border-border/40` + a `before` pseudo-element gradient inner-highlight at the top edge. Replaces the current `bg-card rounded-lg`.
- `Input`, `Label`, `Textarea` — inherit new token values via `globals.css`. No component edits. Focus halo arrives via `focus-visible:ring-ring` already present.

**Add via shadcn CLI (canonical, then layer brand styling):**

- `Card` — `pnpm dlx shadcn@latest add card`. Add `gradient-border` variant (border via `border-image` with the brand gradient) and `glass` variant for hero cards.
- `Badge` — `pnpm dlx shadcn@latest add badge`. Add variants: `gradient`, `success` (`bg-success text-success-foreground`), `warning`, `destructive` (already standard).

### New brand primitives (RSC unless flagged)

| Primitive | RSC vs Client | Notes |
|---|---|---|
| `Logo` | RSC | Pure SVG knockout-tile. Props `{size, mode?}`. Mode auto-resolves via `useTheme()` if a Client wrapper is needed; otherwise renders `var(--brand-*)` and adapts via CSS. |
| `Wordmark` | RSC | Lowercase Geist + kerning B + gradient-`copilot`. Props `{size}`. |
| `Lockup` | RSC | Logo + Wordmark composed. |
| `OrbBackground` | `"use client"` | Decorative drifting gradient orb. Single instance per page, fixed to viewport. Hidden under `prefers-reduced-motion: reduce`. |
| `GlassCard` | RSC | Card variant with `backdrop-blur` + inner-highlight overlay. Implemented as a Card preset. |
| `AnimatedNumber` | `"use client"` | framer-motion `motionValue`. Animates only when `sessionStorage.getItem('jobcopilot:dashboard_seen') !== '1'`; sets the flag on first run. |
| `PageTransition` | `"use client"` | `<AnimatePresence>` wrapper. |
| `ThemeToggle` | `"use client"` | `useTheme()` from `next-themes`. **Uses mounted-only render pattern** — `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []); if (!mounted) return <button aria-label="Toggle theme" disabled style={{width:32,height:32}}/>;` — to avoid SSR/CSR hydration mismatch. |

### Theme infrastructure

- Add dependency: `next-themes` (~2kb).
- Wrap root layout: `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>`. **`attribute="class"` matches Tailwind's `darkMode: ["class"]` config** — Tailwind's `dark:` utilities will pick up the toggled class automatically. (Earlier exploration of `attribute="data-theme"` was abandoned; it would have required a Tailwind config change.)
- Phase A removes the hardcoded `className="dark"` from `<html>` at `app/layout.tsx:11`. ThemeProvider takes over.
- Add `suppressHydrationWarning` to `<html>` to silence the standard next-themes hydration warning.

### App component refactors in `apps/web/src/components/`

- `app-shell.tsx` (Phase A) — `Lockup` at sidebar top (replaces the plain `<div>JobCopilot</div>`); single `OrbBackground` behind sidebar; `ThemeToggle` above sign-out; sign-out restyled. **All `app-shell.tsx` brand changes consolidate in Phase A** — no other phase touches this file.
- `kanban-board.tsx` (Phase B) — column headers use label type + count Badge; **single** `OrbBackground` for the whole board, fixed to viewport. The `<DragOverlay>` child element receives the lift styling: `scale(1.02) rotate(1deg) shadow-2xl`. Render `<ApplicationCard />` inside `<DragOverlay>` directly instead of duplicating the card markup (current code at `kanban-board.tsx:174-180` reimplements the visual — drift risk).
- `application-card.tsx` (Phase B) — refactor to Card primitive. Drag styling stays minimal here (the lift goes on the DragOverlay, not the sortable item).
- `application-detail-tabs.tsx` (Phase C) — pill-tab gradient-underline styling per Tabs primitive change. **`forceMount` + `data-[state=inactive]:hidden` MUST remain** on cover-letter and resume `TabsContent` (lines 333, 337) — this is the state-preservation mechanism for commit `729dfe2`.
- `application-detail-tabs.tsx` (Phase C) — refactor inline `rounded-lg border border-border bg-card p-4` containers (lines 129, 139, 150, 162, 172, 273, 290) to `<Card>` primitive usage.
- `application-detail-tabs.tsx` (Phase C) — replace hardcoded color utilities with token-based equivalents:
  - Line 254 `text-green-600 dark:text-green-400` → `text-success`
  - Line 300-301 `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400` → `<Badge variant="success">Finalized</Badge>`
- `cover-letter-drafter.tsx`, `bullet-suggester.tsx` (Phase C) — Generate button = `gradient` variant; output panel = `GlassCard`. Existing state-preservation behavior (commit `729dfe2`) must stay green. Streaming-cursor deferred to Phase 2a. Internal state-management logic (`useState`, `useEffect`, fetch/mutate handlers) is **not refactored**; visual changes only.
- `cover-letter-drafter.tsx` (Phase C) — raw `<button>` chips at lines 175 (alternates) and 195 (versions) migrate to `<Button variant="ghost" size="sm">` with the same onClick handlers. The native `<select>` at line 145-154 stays as-is (out of scope; no Select primitive refactor).
- `add-application-dialog.tsx` (Phase C) — picks up new Dialog glass treatment automatically via the primitive change.

---

## 6. Page treatments

Visual + motion only — no feature additions.

### `/login` (Phase G)

- Centered logged-out shell. No app sidebar.
- `Lockup` centered with single `OrbBackground` behind it.
- Two OAuth buttons (Google, GitHub) using `gradient` variant.

### `/dashboard` (Phase D)

- Same 4 stat tiles using `AnimatedNumber` + `mono-num`. Cold-load animation only.
- H1 changes from `"Dashboard"` to data-driven `"<N> applications · <M> in progress"` — uses existing query results, no new data.
- `OrbBackground` behind hero region.
- Inline `rounded-lg border border-border bg-card p-5` Stat container at `dashboard/page.tsx:34` refactors to Card primitive (or new dedicated `StatCard`).

### `/tracker` (Phase B — heaviest visual surface, ships first)

- Same 7 columns. Refactored cards, headers, empty states.
- Single `OrbBackground` positioned `fixed inset-0 z-[-1] pointer-events-none` (viewport-fixed; doesn't scroll with the horizontal grid).
- DragOverlay rendering: `<DragOverlay>` wraps `<ApplicationCard ...preview />` (or shared subcomponent) with `scale(1.02) rotate(1deg) shadow-2xl` styling on the wrapper.
- Empty columns: 1px dashed `--border` outline at 50% opacity, centered italicized `small` Inter text at 60% opacity (e.g., "no applications in this stage"). No icon, no button.

### `/applications/[id]` (Phase C)

- Same 5 tabs. Pill-tab indicator with gradient underline.
- Hero strip layout (top of page, above tabs):
  - Row 1: company name in `small` Inter at 70% opacity (eyebrow)
  - Row 2: role title in `title` Geist 600
  - Row 3: status `Badge` (variant matches status: `success` for offer, `destructive` for rejected, default for everything else) + optional jobUrl link rendered as `Inter small` with `<ArrowUpRight />` from lucide (already a project dep)
  - No avatar, no logo fetch.

### `/variants` (Phase E)

- Same CRUD. 2-col grid using Card primitive.
- "+ New variant" tile **always rendered last** — handles odd-count grid balance per `feedback_ui_design_preferences.md` memory rule.

### `/profile` (Phase F)

- Two-column layout: left = identity Card, right = skills as Badges in flex-wrap.
- Defined empty/loading states:
  - No resume uploaded → upload-affordance Card
  - Resume uploaded but parsing not complete → "Extracting skills…" Badge with pulse animation: `@keyframes badge-pulse { 0% { opacity: .6 } 50% { opacity: 1 } 100% { opacity: .6 } }`, 1.6s ease-in-out infinite. Disabled under `prefers-reduced-motion`.
  - Skills parsed → flex-wrap of Badge components.
- Upload zone uses `GlassCard` with drag-drop affordance.

---

## 7. Brand assets

Use Next 14 App Router metadata-file conventions for auto-detection.

| File | Path | Purpose |
|---|---|---|
| `icon.svg` | `apps/web/src/app/icon.svg` | Favicon, gradient knockout (single SVG works on both browser-chrome modes) |
| `icon.ico` | `apps/web/src/app/icon.ico` | Multi-resolution fallback (16/32/48) derived from SVG |
| `apple-icon.png` | `apps/web/src/app/apple-icon.png` | 180×180 from full tile-with-orbit version |
| `opengraph-image.png` | `apps/web/src/app/opengraph-image.png` | 1200×630 dark-mode hero. Composition: Lockup centered-left, tagline below. Tagline: **"AI drafts every piece of an application. You review and ship."** (lifted from `README.md` opening). Single image; no light variant. |

### Build script: `scripts/build-brand-assets.ts`

Generates raster assets from canonical SVG sources. Reuses Playwright (existing dep); adds two devDependencies.

- Script renders HTML templates to PNG via Playwright.
- HTML template inlines `@font-face { font-family: 'Geist'; src: url('https://...') }` from Google Fonts so headless Chromium loads Geist when rendering — system fonts alone won't have it.
- Derives `.ico` from rendered PNGs via `png-to-ico` (~50kb devDependency only).
- Run via `tsx`: `pnpm tsx scripts/build-brand-assets.ts`. Add `tsx` (~150kb) as devDependency in Phase A; output committed.

---

## 8. Phasing + acceptance

Phase gates are **ship criteria**, not timeboxes. After Phase A ships, **Phases B–G can run in any order or in parallel**. Phase A owns *all* root-layout, shell, and primitive changes; Phases B–G never touch root layouts or `app-shell.tsx`.

### Phase 0 — Pre-flight (passed)

- Tailwind v3.4.6 ✓ (HSL-without-commas + shadcn convention applies)
- Next 14.2.5 ✓ (App Router metadata file conventions available)
- `darkMode: ["class"]` already in `tailwind.config.ts` ✓ (aligns with `attribute="class"` ThemeProvider)
- `next-themes`, `framer-motion`, `tsx`, `@axe-core/playwright`, `png-to-ico` not yet installed — added in Phase A

### Phase A — Foundation

Touches: `globals.css`, `tailwind.config.ts`, `app/layout.tsx`, `app-shell.tsx`, all primitive files, brand-asset files, build script.

Ship when:
- `globals.css` updated with new HSL tokens using `:root` (light defaults) + `.dark` (dark overrides) shadcn convention. Includes `--success`, `--success-foreground`, `--warning`, `--warning-foreground`, brand extensions.
- `tailwind.config.ts` extended:
  - `theme.extend.colors` adds `success` and `warning` (with `foreground` pairings)
  - `theme.extend.fontFamily.display: ['Geist', ...]`
  - `theme.extend.borderRadius` adds `xl: var(--radius-xl)` and `tile: var(--radius-tile)` (existing `lg`/`md`/`sm` retained)
- `next/font/google` loads Geist + Inter + JetBrains Mono in `app/layout.tsx`. **Existing `<link>` tags at `app/layout.tsx:13-18` removed.**
- **`<html>` element changes:** hardcoded `className="dark"` removed; `suppressHydrationWarning` added.
- Dependencies installed: `next-themes`, `framer-motion`. DevDependencies installed: `@axe-core/playwright`, `png-to-ico`, `tsx`.
- `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>` wraps root layout. Tailwind's existing `darkMode: ["class"]` picks up the toggled class.
- Brand primitives created and exported: `Logo`, `Wordmark`, `Lockup` (RSC); `OrbBackground`, `AnimatedNumber`, `PageTransition`, `ThemeToggle` (`"use client"`). `ThemeToggle` uses the mounted-only render pattern.
- shadcn `Card` + `Badge` added via CLI; `Button` gains `gradient` variant; `Tabs` gets gradient-underline active treatment; `Dialog` gets glass treatment. `Input`, `Label`, `Textarea` inherit new token values without component edits.
- `app-shell.tsx` fully refactored: `Lockup` at sidebar top, single sidebar `OrbBackground`, `ThemeToggle` above sign-out, sign-out restyled.
- `scripts/build-brand-assets.ts` created and run; brand assets committed under Next 14 metadata-file paths (`app/icon.svg`, `app/icon.ico`, `app/apple-icon.png`, `app/opengraph-image.png`). Build script's HTML template inlines `@font-face` for Geist.
- Test-selector preflight: grep test suite for case-sensitive `"JobCopilot"`; replace with `"jobcopilot"` where Wordmark renders lowercase.
- All six pages render under new tokens: existing Vitest + Playwright suites green, zero new browser console errors on first paint, `pnpm typecheck` clean, no hydration warnings.
- Per-page Playwright axe tests created (one file per route; uses `@axe-core/playwright`, asserts no axe violations) — all green.

### Phases B–G — Page refactors

| Phase | Ships | Owner files | Specific gates |
|---|---|---|---|
| B | Tracker | `app/(app)/tracker/page.tsx`, `kanban-board.tsx`, `application-card.tsx` | `OrbBackground` viewport-fixed; lift styling on `<DragOverlay>` child (NOT on sortable item); DragOverlay renders `<ApplicationCard>` directly instead of duplicating markup; whole-card-drag preserved (commit `729dfe2`); axe green |
| C | Application detail | `app/(app)/applications/[id]/page.tsx`, `application-detail-tabs.tsx`, `cover-letter-drafter.tsx`, `bullet-suggester.tsx`, `add-application-dialog.tsx` | Pill-tab gradient underline; **`forceMount` + `data-[state=inactive]:hidden` preserved** on cover-letter and resume tabs; drafter state-across-tabs preserved (commit `729dfe2`); end-to-end submit flow green; all hardcoded `green-*`/`red-*` color utilities replaced with token equivalents (`text-success`, `<Badge variant="success">`, etc.); inline `rounded-lg border border-border bg-card` containers refactored to Card primitive; raw `<button>` chips in drafter migrate to Button primitive; native `<select>` at line 145 stays as-is; axe green |
| D | Dashboard | `app/(app)/dashboard/page.tsx` | StatCards + cold-load gating + data-driven H1; OrbBackground behind hero; existing inline Stat container refactored to Card primitive; axe green |
| E | Variants | `app/(app)/variants/page.tsx` | 2-col grid; "+ New variant" always last; existing CRUD tests green; axe green |
| F | Profile | `app/(app)/profile/page.tsx` | Two-column layout; defined empty/loading states; existing upload + parse e2e green; axe green |
| G | Login | `app/(auth)/login/page.tsx` | Centered Lockup + OrbBackground; gradient OAuth buttons; existing OAuth e2e green; axe green |

### Phase H — Motion + transitions

Touches: `app/(app)/layout.tsx` (wraps children with `<PageTransition>`).

Ship when:
- `PageTransition` wraps `(app)` route group children
- Route changes use cross-fade + 4px translate via framer-motion
- `prefers-reduced-motion: reduce` fully honored: orbs hidden, animation/transition duration ≈ 0, badge pulses stop, counters skip animation
- Stat-counter cold-load gating works (sessionStorage `jobcopilot:dashboard_seen` clears on tab close)

### Feature-complete gate

After Phase H ships, redesign is **feature-complete**. Phase I follows asynchronously.

### Phase I — Demo recording (owner: Ethan, async)

Ship when:
- 30-60s screen capture of drafting + submitting an application via the redesigned app
- Hosted as a **GitHub release asset** (avoids repo bloat)
- `README.md` updated with embed/link
- Subagent contribution: README copy update once Ethan provides asset URL

### Milestone acceptance

Required for "shipped":
1. Design system as code (tokens + primitives + motion + brand assets) — Phase A
2. All six existing pages in the new system — Phases B–G
3. Phase 2a's `/settings` will inherit the system without further design work — preserved by foundation-first
4. Motion shipped — Phase H
5. End-to-end application-submission flow remains green throughout
6. Ethan confirms it looks like a real AI startup product, not generic SaaS prototype

Async post-feature-complete:
7. Demo recording — Phase I

---

## 9. Risks the spec explicitly addresses

| Risk | Mitigation |
|---|---|
| Tailwind class-mode vs ThemeProvider `data-theme` mismatch | Use `attribute="class"`; aligns with existing `darkMode: ["class"]` |
| Hardcoded `<html className="dark">` blocks theme switching | Removed in Phase A |
| next-themes hydration warning | `suppressHydrationWarning` on `<html>` + mounted-only ThemeToggle |
| Existing font `<link>` tags double-load when `next/font` added | Removed in Phase A |
| `borderRadius` token migration silent breakage | Added new `xl`/`tile` keys; existing `lg`/`md`/`sm` retain meaning |
| `success`/`warning` colors invisible to Tailwind utilities | Wired into `theme.extend.colors` in Phase A |
| @dnd-kit drag-lift target ambiguity (sortable item vs DragOverlay) | Phase B: lift styling on `<DragOverlay>` child only |
| `forceMount` removal regressing drafter state-across-tabs | Phase C explicit ship gate; commit `729dfe2` test green |
| Theme FOUC on first paint | `next-themes` handles SSR theme via class injection |
| Multiple orbs CPU/GPU cost | Single instance per page; viewport-fixed positioning |
| Streaming-cursor depends on Phase 2a infrastructure | Deferred entirely to Phase 2a |
| Phase 1 polish regression (commit `729dfe2`) | Per-phase test preservation criterion |
| Color contrast on light-mode muted text | Bumped to ~5.5:1; per-page axe gate |
| End-to-end submit flow regression | Explicit per-phase Playwright e2e gate |
| Test selector regression on Lockup swap | Phase A grep + fix |
| Layout file conflicts in parallel execution | Phase A owns all root layouts; B–G never touch them; Phase H wraps existing |
| `display-xl` tracking regression at large sizes | Capped at `-0.025em` (kerning B) at every scale step |
| Color emoji in new components | **No color emoji ever** (per memory `40_feedback_no_emoji_ui.md`); use lucide monochrome glyphs |
| OG-image rendering missing Geist | Build-script HTML template inlines `@font-face` for Geist |
| DragOverlay markup drift from ApplicationCard | DragOverlay renders `<ApplicationCard>` directly, not duplicate markup |

---

## 10. Out of scope

Per the directive — purely visual + motion + brand:

- New filters, search, sorting on tracker
- New tabs or fields on applications detail
- Resume preview thumbnails on variants
- Recent activity feeds, leaderboards, suggestions
- `/settings` page (Phase 2a)
- Streaming-cursor on AI panels (Phase 2a — depends on streaming infrastructure)
- Marketing landing page, custom domain, paid tooling
- Brand reel for LinkedIn (deferred indefinitely)
- Refactor of underlying state-management logic in `cover-letter-drafter.tsx` / `bullet-suggester.tsx` (visual changes only)
- Refactor of native `<select>` at `cover-letter-drafter.tsx:145` to a styled Select primitive (component scope creep)
- TypeScript hardening of `application: any` props in detail-tabs (separate scope)

---

## 11. Notes for Phase 2a (out of scope, design preserves)

- `/settings` page (BYO Anthropic) gets designed from scratch using the new design system — zero new design work needed.
- Streaming-cursor lands on `cover-letter-drafter` / `bullet-suggester` once `lib/ai.ts` stream signal is wired.
- No `Co-Authored-By: Claude` trailer in commits made during execution (per project memory).

---

## 12. References

- Directive: `docs/directives/2026-05-04-ui-redesign.md`
- Phase 1 design (existing palette + product context): `docs/specs/2026-04-14-job-hunt-copilot-design.md`
- Phase 2a design (constrains `/settings` inheritance): `docs/specs/2026-05-04-byo-multi-provider-ai-design.md`
- Project memory (auto-loaded): `00_brand_invariants.md`, `40_feedback_no_emoji_ui.md`, `40_feedback_no_fabricated_roadmap.md`, `40_feedback_ui_design_preferences.md`, `40_reference_silkscreen_all_caps.md`
- Brainstorm visual companion artifacts: `.superpowers/brainstorm/204-1777947404/content/*.html` (gitignored)
