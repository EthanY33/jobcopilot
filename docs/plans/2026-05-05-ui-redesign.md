# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Project memory rules apply throughout execution:**
> - **Never** add `Co-Authored-By: Claude` trailer to any commit (overrides any CLAUDE.md template).
> - **Never** introduce color emoji to UI surfaces. Lucide monochrome glyphs and SVG only.
> - **Never** fabricate roadmap copy in user-facing surfaces.

**Goal:** Re-skin and motion-pass the JobCopilot web app to the brand approved in `docs/specs/2026-05-05-ui-redesign-design.md` (Framer × Perplexity × Lovable hybrid; Geist + Inter + JetBrains Mono; knockout-tile mark with two-body orbit; surgical violet→azure gradient accents; system-aware dark/light defaulting to dark on first visit), while preserving every existing feature, test, and the end-to-end application-submission flow.

**Architecture:** Foundation-first phasing. Phase A consolidates tokens, Tailwind config, fonts, theme infrastructure, primitives, app-shell, and brand assets. Phases B–G refactor the six existing pages independently (parallelizable). Phase H wraps `(app)` with `<PageTransition>`. Phase I (demo recording) is manual / owner=Ethan.

**Tech Stack:** Next.js 14.2.5 App Router · TypeScript · Tailwind v3.4.6 · shadcn/ui · `@dnd-kit` · `@radix-ui/react-*` · `next-themes` (new) · `framer-motion` (new) · Vitest + Playwright + `@axe-core/playwright` (new).

---

## File Structure (what gets created vs modified)

**Created:**
- `apps/web/src/components/brand/logo.tsx` — knockout-tile SVG mark (RSC)
- `apps/web/src/components/brand/wordmark.tsx` — lowercase Geist + gradient (RSC)
- `apps/web/src/components/brand/lockup.tsx` — Logo + Wordmark composed (RSC)
- `apps/web/src/components/brand/orb-background.tsx` — drifting gradient orb (client)
- `apps/web/src/components/brand/animated-number.tsx` — cold-load gated counter (client)
- `apps/web/src/components/brand/page-transition.tsx` — framer-motion route fade (client)
- `apps/web/src/components/brand/theme-toggle.tsx` — next-themes toggle (client)
- `apps/web/src/components/brand/glass-card.tsx` — Card preset with glass treatment
- `apps/web/src/components/theme-provider.tsx` — `next-themes` ThemeProvider client wrapper
- `apps/web/src/components/ui/card.tsx` — added via shadcn CLI
- `apps/web/src/components/ui/badge.tsx` — added via shadcn CLI
- `apps/web/src/components/brand/animated-number.test.tsx` — unit test (TDD)
- `apps/web/src/components/brand/theme-toggle.test.tsx` — unit test (TDD)
- `apps/web/src/app/icon.svg` — favicon source
- `apps/web/src/app/icon.ico` — favicon ICO
- `apps/web/src/app/apple-icon.png` — 180×180 apple-touch
- `apps/web/src/app/opengraph-image.png` — 1200×630 share preview
- `apps/web/scripts/build-brand-assets.ts` — Playwright + png-to-ico build script
- `apps/web/tests/e2e/axe.dashboard.spec.ts` — axe a11y test for /dashboard
- `apps/web/tests/e2e/axe.tracker.spec.ts` — axe a11y test for /tracker
- `apps/web/tests/e2e/axe.application.spec.ts` — axe a11y test for /applications/[id]
- `apps/web/tests/e2e/axe.variants.spec.ts` — axe a11y test for /variants
- `apps/web/tests/e2e/axe.profile.spec.ts` — axe a11y test for /profile
- `apps/web/tests/e2e/axe.login.spec.ts` — axe a11y test for /login

**Modified:**
- `apps/web/src/app/globals.css` — replace HSL token block (`:root` light + `.dark` overrides; new tokens; brand extensions)
- `apps/web/tailwind.config.ts` — extend `colors` (success/warning), `fontFamily.display` (Geist), `borderRadius` (xl, tile)
- `apps/web/src/app/layout.tsx` — `next/font` for Geist+Inter+JetBrainsMono; remove existing `<link>` tags; remove hardcoded `className="dark"`; add `suppressHydrationWarning`; wrap with `<ThemeProvider>`
- `apps/web/src/components/app-shell.tsx` — Lockup, OrbBackground, ThemeToggle, restyled sign-out
- `apps/web/src/components/ui/button.tsx` — add `gradient` variant via cva
- `apps/web/src/components/ui/tabs.tsx` — gradient-underline active indicator
- `apps/web/src/components/ui/dialog.tsx` — glass treatment on content
- `apps/web/src/components/kanban-board.tsx` — column header label+badge; OrbBackground; DragOverlay renders ApplicationCard with lift styling
- `apps/web/src/components/application-card.tsx` — Card primitive; lift styling stays minimal here
- `apps/web/src/components/application-detail-tabs.tsx` — preserve `forceMount`; refactor inline rounded-lg patterns to Card; replace hardcoded greens with token equivalents
- `apps/web/src/components/cover-letter-drafter.tsx` — gradient Generate button; GlassCard output panel; `<button>` chips → Button variant
- `apps/web/src/components/bullet-suggester.tsx` — same treatment as cover-letter-drafter
- `apps/web/src/components/add-application-dialog.tsx` — picks up new Dialog glass automatically
- `apps/web/src/app/(app)/dashboard/page.tsx` — StatCards, AnimatedNumber, data-driven H1, OrbBackground
- `apps/web/src/app/(app)/tracker/page.tsx` — refactored layout (KanbanBoard handles its own internals)
- `apps/web/src/app/(app)/applications/[id]/page.tsx` — hero strip layout
- `apps/web/src/app/(app)/variants/page.tsx` — 2-col grid with "+ New" tile last
- `apps/web/src/app/(app)/profile/page.tsx` — two-column layout, defined empty/loading states
- `apps/web/src/app/(auth)/login/page.tsx` — centered Lockup, OrbBackground, gradient OAuth buttons
- `apps/web/src/app/(app)/layout.tsx` — wrap children with `<PageTransition>` (Phase H only)
- `apps/web/package.json` — add `next-themes`, `framer-motion`, `@axe-core/playwright`, `png-to-ico`, `tsx`
- `apps/web/.gitignore` (root already updated for `.superpowers/`)
- `README.md` — Phase I demo recording link

---

# Phase A — Foundation

**Serial.** All Phase B–G work depends on Phase A finishing cleanly.

## Task A1: Install runtime + dev dependencies

**Files:**
- Modify: `apps/web/package.json` (via pnpm)

- [ ] **Step 1: Install runtime deps**

```bash
pnpm -F @jobcopilot/web add next-themes@^0.3 framer-motion@^11
```

- [ ] **Step 2: Install dev deps**

```bash
pnpm -F @jobcopilot/web add -D @axe-core/playwright png-to-ico tsx
```

- [ ] **Step 3: Verify install**

Run: `pnpm -F @jobcopilot/web exec next --version`
Expected: `Next.js v14.2.5` (no install errors)

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): add next-themes, framer-motion, axe, png-to-ico, tsx"
```

---

## Task A2: Replace `globals.css` token block

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Replace the entire `@layer base { :root { ... } }` block with the new token system**

Open `apps/web/src/app/globals.css`. Replace the existing file contents with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light mode = default; dark overrides via .dark class */
    --background: 38 35% 97%;
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
    --muted-foreground: 240 13% 32%;
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

    --radius-sm: 6px;
    --radius: 10px;
    --radius-xl: 22px;
    --radius-tile: 26px;

    --brand-violet: 258 90% 60%;
    --brand-azure: 215 95% 50%;
    --gradient-brand: linear-gradient(135deg, hsl(var(--brand-violet)), hsl(var(--brand-azure)));

    --ease: 200ms cubic-bezier(.2,.8,.2,1);
    --ease-quick: 120ms cubic-bezier(.2,.8,.2,1);
    --ease-page: 280ms cubic-bezier(.16,1,.3,1);
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

  html { color-scheme: light dark; }
  body { @apply bg-background text-foreground font-sans; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

- [ ] **Step 2: Run typecheck + dev server smoke**

```bash
pnpm -F @jobcopilot/web typecheck
```

Expected: zero errors. (CSS isn't typechecked but tsc verifies the rest still compiles.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(web): rewrite globals.css token block — light default + .dark overrides"
```

---

## Task A3: Extend `tailwind.config.ts`

**Files:**
- Modify: `apps/web/tailwind.config.ts`

- [ ] **Step 1: Replace file contents**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        success: { DEFAULT: "hsl(var(--success))", foreground: "hsl(var(--success-foreground))" },
        warning: { DEFAULT: "hsl(var(--warning))", foreground: "hsl(var(--warning-foreground))" },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "var(--radius-xl)",
        tile: "var(--radius-tile)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-geist)", "var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm -F @jobcopilot/web typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/tailwind.config.ts
git commit -m "feat(web): extend tailwind config — success/warning, geist display, xl/tile radii"
```

---

## Task A4: Create `ThemeProvider` client wrapper

**Files:**
- Create: `apps/web/src/components/theme-provider.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

> Why this shape: `next-themes@^0.3` does not re-export `ThemeProviderProps` from its package root, and reaching into `next-themes/dist/types` is brittle. Deriving the type with `React.ComponentProps<typeof NextThemesProvider>` keeps imports rooted at the public API.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/theme-provider.tsx
git commit -m "feat(web): add ThemeProvider client wrapper for next-themes"
```

---

## Task A5: Update `app/layout.tsx` — fonts, theme, hydration

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

// Geist is not on Google Fonts; fall back to local @fontsource if installed,
// otherwise we use the npm `geist` package (Vercel official). For this plan
// we add it via next/font/google's surrogate that ships Geist as of 2024.
import { GeistSans } from "geist/font/sans";

export const metadata: Metadata = {
  title: "JobCopilot",
  description: "AI-assisted job application copilot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${GeistSans.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Install the `geist` package**

```bash
pnpm -F @jobcopilot/web add geist
```

(`geist` is the canonical Vercel package; ships `GeistSans.variable` which yields `--font-geist-sans` — but our tailwind config maps `--font-geist`. The package's `GeistSans` actually exposes its own variable. Adjust by reading the package's exported name.)

- [ ] **Step 3: Verify the variable name**

```bash
node -e "console.log(Object.keys(require('geist/font/sans')))"
```

Expected output names a `GeistSans` object with a `.variable` property. If `.variable` does NOT equal `--font-geist`, update `tailwind.config.ts` `fontFamily.display` to use the actual variable name (e.g., `--font-geist-sans`).

- [ ] **Step 4: Update tailwind config to match if needed**

If `GeistSans.variable === '--font-geist-sans'`, modify `apps/web/tailwind.config.ts`:

```ts
fontFamily: {
  sans: ["var(--font-inter)", "system-ui", "sans-serif"],
  display: ["var(--font-geist-sans)", "var(--font-inter)", "sans-serif"],
  mono: ["var(--font-jetbrains)", "monospace"],
},
```

- [ ] **Step 5: Run dev server and verify visually**

```bash
pnpm -F @jobcopilot/web dev
```

Open `http://localhost:3000`. Hard-refresh. Page should render with new fonts + dark theme. No console errors. Theme should still be dark (default).

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/app/layout.tsx apps/web/tailwind.config.ts
git commit -m "feat(web): wire next/font (Geist+Inter+JetBrains), ThemeProvider, suppressHydrationWarning"
```

---

## Task A6: Test selector preflight — find case-sensitive `"JobCopilot"` matches

**Files:**
- Audit: `apps/web/tests/**/*.{ts,tsx}`

- [ ] **Step 1: Grep for case-sensitive matches**

Run via Grep tool:
```
pattern: \bJobCopilot\b
path: apps/web/tests/
type: ts
```

- [ ] **Step 2: For each match, decide if it asserts on UI text**

If the match is in a test selector (e.g., `getByText("JobCopilot")`, `toHaveText("JobCopilot")`), update it to `getByText(/jobcopilot/i)` (case-insensitive regex) — the new Wordmark renders lowercase letters but visually looks the same. If the match is in a comment or non-asserting code, leave it.

- [ ] **Step 3: Run the existing test suite**

```bash
pnpm -F @jobcopilot/web test
```

Expected: green. If a test fails because of the case-sensitivity, fix it per Step 2.

- [ ] **Step 4: Commit (only if any fixes were needed)**

```bash
git add apps/web/tests
git commit -m "test(web): preflight test selectors for lowercase wordmark"
```

---

## Task A7: Create `Logo` component (RSC)

**Files:**
- Create: `apps/web/src/components/brand/logo.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="JobCopilot logo"
      className={cn("inline-block", className)}
    >
      <defs>
        <linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand-violet))" />
          <stop offset="100%" stopColor="hsl(var(--brand-azure))" />
        </linearGradient>
        <mask id="brand-mask">
          <rect x="0" y="0" width="120" height="120" rx="26" fill="#fff" />
          <g transform="rotate(-22 60 60)">
            <ellipse cx="60" cy="60" rx="34" ry="10" fill="none" stroke="#000" strokeWidth="3.5" />
            <circle cx="26" cy="60" r="10" fill="#000" />
            <circle cx="94" cy="60" r="10" fill="#000" />
          </g>
        </mask>
      </defs>
      <rect x="0" y="0" width="120" height="120" rx="26" fill="url(#brand-grad)" mask="url(#brand-mask)" />
    </svg>
  );
}
```

> **Note:** SVG `<defs>` ids (`brand-grad`, `brand-mask`) are global per document. If multiple Logos render on the same page, ids must be unique per-instance. If lint or visual issues surface, convert to `useId()` and switch component to `"use client"`. For Phase A's expected usage (one Lockup per page max) the static ids are fine.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/brand/logo.tsx
git commit -m "feat(web): add Logo brand primitive (knockout-tile gradient mark)"
```

---

## Task A8: Create `Wordmark` component (RSC)

**Files:**
- Create: `apps/web/src/components/brand/wordmark.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { cn } from "@/lib/utils";

interface WordmarkProps {
  size?: number;
  className?: string;
}

export function Wordmark({ size = 24, className }: WordmarkProps) {
  return (
    <span
      className={cn("inline-flex font-display font-bold leading-none", className)}
      style={{ fontSize: size, letterSpacing: "-0.025em" }}
    >
      <span>job</span>
      <span
        className="bg-clip-text text-transparent"
        style={{ backgroundImage: "var(--gradient-brand)" }}
      >
        copilot
      </span>
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/brand/wordmark.tsx
git commit -m "feat(web): add Wordmark primitive (lowercase Geist + gradient copilot)"
```

---

## Task A9: Create `Lockup` component (RSC)

**Files:**
- Create: `apps/web/src/components/brand/lockup.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { Logo } from "./logo";
import { Wordmark } from "./wordmark";
import { cn } from "@/lib/utils";

interface LockupProps {
  logoSize?: number;
  wordSize?: number;
  gap?: number;
  className?: string;
}

export function Lockup({ logoSize = 28, wordSize = 18, gap = 10, className }: LockupProps) {
  return (
    <span className={cn("inline-flex items-center", className)} style={{ gap }}>
      <Logo size={logoSize} />
      <Wordmark size={wordSize} />
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/brand/lockup.tsx
git commit -m "feat(web): add Lockup primitive (Logo + Wordmark composed)"
```

---

## Task A10: Create `OrbBackground` (client)

**Files:**
- Create: `apps/web/src/components/brand/orb-background.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { cn } from "@/lib/utils";

interface OrbBackgroundProps {
  className?: string;
  /** "viewport" = fixed to viewport (use once per page); "container" = absolute within parent */
  position?: "viewport" | "container";
}

export function OrbBackground({ className, position = "viewport" }: OrbBackgroundProps) {
  const positionClasses =
    position === "viewport"
      ? "fixed inset-0 -z-10 pointer-events-none"
      : "absolute inset-0 pointer-events-none";

  return (
    <div className={cn(positionClasses, "overflow-hidden motion-reduce:hidden", className)} aria-hidden="true">
      <div
        className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full opacity-50"
        style={{
          background: "radial-gradient(closest-side, hsl(var(--brand-violet) / .35), transparent 70%)",
          filter: "blur(40px)",
          animation: "orb-drift-1 24s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute -bottom-24 -left-16 h-[300px] w-[300px] rounded-full opacity-40"
        style={{
          background: "radial-gradient(closest-side, hsl(var(--brand-azure) / .3), transparent 70%)",
          filter: "blur(50px)",
          animation: "orb-drift-2 30s ease-in-out infinite alternate",
        }}
      />
      <style>{`
        @keyframes orb-drift-1 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-40px, 30px); }
        }
        @keyframes orb-drift-2 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(30px, -40px); }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/brand/orb-background.tsx
git commit -m "feat(web): add OrbBackground (drifting gradient orbs, reduce-motion safe)"
```

---

## Task A11: TDD — `AnimatedNumber` (cold-load gating)

**Files:**
- Test: `apps/web/src/components/brand/animated-number.test.tsx`
- Create: `apps/web/src/components/brand/animated-number.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { AnimatedNumber } from "./animated-number";

describe("AnimatedNumber", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("renders the target value immediately on subsequent loads (flag set)", () => {
    sessionStorage.setItem("jobcopilot:dashboard_seen", "1");
    const { container } = render(<AnimatedNumber value={42} flagKey="jobcopilot:dashboard_seen" />);
    expect(container.textContent).toBe("42");
  });

  it("animates from 0 on first load and sets the flag", () => {
    expect(sessionStorage.getItem("jobcopilot:dashboard_seen")).toBeNull();
    const { container } = render(<AnimatedNumber value={42} flagKey="jobcopilot:dashboard_seen" />);
    // Pre-animation: starts at 0
    expect(container.textContent).toBe("0");
    // Flag set during render
    expect(sessionStorage.getItem("jobcopilot:dashboard_seen")).toBe("1");
  });

  it("renders the integer value at the end of the animation duration", async () => {
    const { container } = render(<AnimatedNumber value={42} flagKey="test:key" durationMs={300} />);
    expect(container.textContent).toBe("0");
    await new Promise((r) => setTimeout(r, 400));
    expect(container.textContent).toBe("42");
  });
});
```

> Why no `vi.useFakeTimers()`: jsdom drives `requestAnimationFrame` via an internal counter that leaks state between tests when fake timers are toggled mid-suite — test 2's RAF call increments the counter to 1, then test 3's RAF goes 1→2 and never creates a new driver. Real timers throughout sidesteps the leak. Tests 1 and 2 are synchronous, test 3 uses a real-timer setTimeout wait with a short `durationMs={300}` to keep the suite fast.

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm -F @jobcopilot/web test src/components/brand/animated-number.test.tsx
```

Expected: FAIL with "Cannot find module './animated-number'".

- [ ] **Step 3: Write minimal implementation**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  flagKey: string;
  durationMs?: number;
  className?: string;
}

export function AnimatedNumber({ value, flagKey, durationMs = 1200, className }: AnimatedNumberProps) {
  const seen = typeof window !== "undefined" && window.sessionStorage.getItem(flagKey) === "1";
  const [display, setDisplay] = useState<number>(seen ? value : 0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (seen) return;
    if (startedRef.current) return;
    startedRef.current = true;
    window.sessionStorage.setItem(flagKey, "1");

    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const from = 0;
    const to = value;

    function tick() {
      const elapsed = performance.now() - start;
      const t = Math.max(0, Math.min(1, elapsed / durationMs));
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value, flagKey, durationMs, seen]);

  return <span className={className}>{display}</span>;
}
```

> Why `performance.now()` inside `tick()` (not the RAF callback's `now` arg): the RAF callback's timestamp uses jsdom's animation clock, which can be on a different time base than `performance.now()` used for `start`. Computing `elapsed = performance.now() - start` keeps both reads on the same clock. The `Math.max(0, ...)` clamp also guards against any briefly-negative drift. In real browsers RAF and `performance.now()` track each other within a frame so the production behavior is unchanged.

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm -F @jobcopilot/web test src/components/brand/animated-number.test.tsx
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/brand/animated-number.tsx apps/web/src/components/brand/animated-number.test.tsx
git commit -m "feat(web): add AnimatedNumber with cold-load sessionStorage gating + tests"
```

---

## Task A12: TDD — `ThemeToggle` (mounted-only render)

**Files:**
- Test: `apps/web/src/components/brand/theme-toggle.test.tsx`
- Create: `apps/web/src/components/brand/theme-toggle.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  function renderInProvider() {
    return render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <ThemeToggle />
      </ThemeProvider>,
    );
  }

  it("renders a placeholder before mount (avoids SSR/CSR hydration mismatch)", () => {
    renderInProvider();
    const btn = screen.getByRole("button", { name: /toggle theme/i });
    expect(btn).toBeDefined();
  });

  it("becomes interactive after mount", async () => {
    renderInProvider();
    // After useEffect runs, the toggle should be enabled (the placeholder branch is for the very first render only).
    const btn = await screen.findByRole("button", { name: /toggle theme/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm -F @jobcopilot/web test src/components/brand/theme-toggle.test.tsx
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Write minimal implementation**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        disabled
        className={className}
        style={{ width: 32, height: 32 }}
      />
    );
  }

  const isDark = (resolvedTheme ?? theme) === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={className}
    >
      {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm -F @jobcopilot/web test src/components/brand/theme-toggle.test.tsx
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/brand/theme-toggle.tsx apps/web/src/components/brand/theme-toggle.test.tsx
git commit -m "feat(web): add ThemeToggle with mounted-only render pattern + tests"
```

---

## Task A13: Create `PageTransition` (client)

**Files:**
- Create: `apps/web/src/components/brand/page-transition.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

interface Props {
  children: React.ReactNode;
}

export function PageTransition({ children }: Props) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/brand/page-transition.tsx
git commit -m "feat(web): add PageTransition wrapper (framer-motion route fade)"
```

---

## Task A14: Add shadcn `Card` + `Badge` primitives via CLI

**Files:**
- Create: `apps/web/src/components/ui/card.tsx`
- Create: `apps/web/src/components/ui/badge.tsx`

- [ ] **Step 1: Add Card via CLI**

```bash
pnpm -F @jobcopilot/web dlx shadcn@latest add card
```

If the CLI prompts for config, accept defaults (TypeScript yes, RSC yes, alias `@/components`).

- [ ] **Step 2: Add Badge via CLI**

```bash
pnpm -F @jobcopilot/web dlx shadcn@latest add badge
```

- [ ] **Step 3: Add custom variants to Badge**

Open `apps/web/src/components/ui/badge.tsx`. Find the `badgeVariants` cva block. Replace its `variants.variant` block with:

```ts
variant: {
  default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
  secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
  outline: "text-foreground",
  success: "border-transparent bg-success text-success-foreground hover:bg-success/80",
  warning: "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
  gradient:
    "border-transparent text-white bg-[image:var(--gradient-brand)] hover:opacity-90",
},
```

- [ ] **Step 4: Verify imports compile**

```bash
pnpm -F @jobcopilot/web typecheck
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/card.tsx apps/web/src/components/ui/badge.tsx
git commit -m "feat(web): add shadcn Card + Badge primitives (success/warning/gradient variants)"
```

---

## Task A15: Add `gradient` variant to `Button`

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx`

- [ ] **Step 1: Edit the cva variants block**

Replace the existing `variants.variant` block with:

```ts
variant: {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  gradient:
    "text-white bg-[image:var(--gradient-brand)] hover:opacity-90 shadow-sm shadow-[hsl(var(--brand-violet)/.4)]",
},
```

- [ ] **Step 2: Verify build**

```bash
pnpm -F @jobcopilot/web typecheck && pnpm -F @jobcopilot/web test
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/button.tsx
git commit -m "feat(web): add gradient variant to Button"
```

---

## Task A16: Create `GlassCard` preset

**Files:**
- Create: `apps/web/src/components/brand/glass-card.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type GlassCardProps = React.ComponentProps<typeof Card>;

export function GlassCard({ className, ...props }: GlassCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/40 bg-card/70 backdrop-blur-md",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px",
        "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/brand/glass-card.tsx
git commit -m "feat(web): add GlassCard preset (backdrop-blur + inner highlight)"
```

---

## Task A17: Restyle `Tabs` primitive — gradient underline active indicator

**Files:**
- Modify: `apps/web/src/components/ui/tabs.tsx`

- [ ] **Step 1: Replace `TabsTrigger` className**

Find the `TabsTrigger` `cn(...)` argument and replace it with:

```tsx
cn(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
  "after:pointer-events-none after:absolute after:inset-x-3 after:bottom-1 after:h-[2px] after:rounded-full after:opacity-0 after:transition-opacity",
  "after:bg-[image:var(--gradient-brand)] data-[state=active]:after:opacity-100",
  className,
)
```

- [ ] **Step 2: Run tests**

```bash
pnpm -F @jobcopilot/web test
```

Expected: green (Tabs primitive tests, if any, still pass — the change is presentational).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/tabs.tsx
git commit -m "feat(web): tabs — add gradient underline active indicator"
```

---

## Task A18: Restyle `Dialog` primitive — glass treatment

**Files:**
- Modify: `apps/web/src/components/ui/dialog.tsx`

- [ ] **Step 1: Replace `DialogContent` className**

Find the `DialogPrimitive.Content` `cn(...)` argument and replace with:

```tsx
cn(
  "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 p-6 shadow-2xl rounded-xl",
  "border border-border/40 bg-card/85 backdrop-blur-md",
  "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px",
  "before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  className,
)
```

- [ ] **Step 2: Replace overlay className** (subtle blur instead of plain bg)

Find the `DialogPrimitive.Overlay` className and replace with:

```tsx
cn(
  "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  className,
)
```

- [ ] **Step 3: Run tests**

```bash
pnpm -F @jobcopilot/web test
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/dialog.tsx
git commit -m "feat(web): dialog — glass treatment with backdrop blur and inner highlight"
```

---

## Task A19: Refactor `app-shell.tsx` — Lockup + sidebar OrbBackground + ThemeToggle

**Files:**
- Modify: `apps/web/src/components/app-shell.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, KanbanSquare, User, Files, LogOut } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Lockup } from "@/components/brand/lockup";
import { OrbBackground } from "@/components/brand/orb-background";
import { ThemeToggle } from "@/components/brand/theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tracker", label: "Tracker", icon: KanbanSquare },
  { href: "/variants", label: "Resume Variants", icon: Files },
  { href: "/profile", label: "Profile", icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = getBrowserSupabase();
  return (
    <div className="relative flex min-h-screen">
      <OrbBackground />
      <aside className="relative z-10 w-60 shrink-0 border-r border-border bg-card/60 backdrop-blur-sm p-4 flex flex-col">
        <div className="mb-6 px-2">
          <Lockup logoSize={26} wordSize={17} />
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent/15 text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-1">
          <ThemeToggle className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground" />
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="relative z-10 flex-1 p-8">{children}</main>
    </div>
  );
}
```

> **Note:** the existing `ThemeToggle` from Task A12 takes a `className` and renders icon-only. The styling above puts it in a label-bearing row. If that visual ends up clunky, refactor `ThemeToggle` later to optionally render label text — out of scope for this task.

- [ ] **Step 2: Run dev server smoke**

```bash
pnpm -F @jobcopilot/web dev
```

Open `/dashboard`. Expect: sidebar shows Lockup at top, drifting orbs visible in background, ThemeToggle clickable above sign-out, sign-out works.

- [ ] **Step 3: Run all tests**

```bash
pnpm -F @jobcopilot/web test && pnpm -F @jobcopilot/web typecheck
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/app-shell.tsx
git commit -m "feat(web): app-shell — Lockup, OrbBackground, ThemeToggle, restyled sign-out"
```

---

## Task A20: Create `scripts/build-brand-assets.ts`

**Files:**
- Create: `apps/web/scripts/build-brand-assets.ts`

- [ ] **Step 1: Create the script**

```ts
/**
 * Renders brand assets (favicon, apple-icon, opengraph-image) from canonical SVG markup.
 * Reuses Playwright (existing dev dep) to render at exact pixel sizes; uses png-to-ico
 * to package multi-resolution favicon.ico.
 *
 * Run: pnpm tsx scripts/build-brand-assets.ts
 */

import { chromium } from "@playwright/test";
import pngToIco from "png-to-ico";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const APP_DIR = path.resolve(__dirname, "..", "src", "app");
const TMP_DIR = path.resolve(__dirname, "..", ".brand-build");

const tileSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#9b67ee"/>
      <stop offset="100%" stop-color="#2c81ff"/>
    </linearGradient>
    <mask id="m">
      <rect x="0" y="0" width="120" height="120" rx="26" fill="#fff"/>
      <g transform="rotate(-22 60 60)">
        <ellipse cx="60" cy="60" rx="34" ry="10" fill="none" stroke="#000" stroke-width="3.5"/>
        <circle cx="26" cy="60" r="10" fill="#000"/>
        <circle cx="94" cy="60" r="10" fill="#000"/>
      </g>
    </mask>
  </defs>
  <rect x="0" y="0" width="120" height="120" rx="26" fill="url(#g)" mask="url(#m)"/>
</svg>`.trim();

const ogTemplate = `
<!DOCTYPE html><html><head>
  <meta charset="utf-8" />
  <style>
    @font-face { font-family: 'Geist'; src: url('https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@latest/files/geist-sans-latin-700-normal.woff2') format('woff2'); font-weight: 700; }
    @font-face { font-family: 'Inter'; src: url('https://cdn.jsdelivr.net/npm/@fontsource/inter@latest/files/inter-latin-500-normal.woff2') format('woff2'); font-weight: 500; }
    body { margin:0; width:1200px; height:630px; background:#0a0a10; color:#f4f4f8;
           font-family:'Inter', sans-serif; padding:80px; box-sizing:border-box;
           display:flex; flex-direction:column; justify-content:center; }
    .lockup { display:flex; align-items:center; gap:20px; margin-bottom: 32px; }
    .mark { width:96px; height:96px; }
    .word { font-family:'Geist'; font-weight:700; font-size:96px; letter-spacing:-0.025em; line-height:1; }
    .word .copilot { background: linear-gradient(135deg,#9b67ee,#2c81ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .tag { font-family:'Inter'; font-weight:500; font-size:32px; max-width:980px; line-height:1.4; opacity:.85; }
  </style>
</head><body>
  <div class="lockup">
    <div class="mark">${tileSvg.replace(/512/g, "96")}</div>
    <div class="word">job<span class="copilot">copilot</span></div>
  </div>
  <div class="tag">AI drafts every piece of an application. You review and ship.</div>
</body></html>`;

async function ensureDir(p: string) { if (!existsSync(p)) await mkdir(p, { recursive: true }); }

async function renderTile(size: number, outPath: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0">${tileSvg.replace(/512/g, String(size))}</body></html>`);
  await page.screenshot({ path: outPath, omitBackground: true });
  await browser.close();
}

async function renderOg(outPath: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(ogTemplate, { waitUntil: "networkidle" });
  await page.screenshot({ path: outPath });
  await browser.close();
}

async function main() {
  await ensureDir(TMP_DIR);

  // 1. SVG favicon — write the canonical SVG to app/icon.svg
  await writeFile(path.join(APP_DIR, "icon.svg"), tileSvg.replace(/512/g, "32"));

  // 2. apple-icon.png at 180×180
  await renderTile(180, path.join(APP_DIR, "apple-icon.png"));

  // 3. opengraph-image.png at 1200×630
  await renderOg(path.join(APP_DIR, "opengraph-image.png"));

  // 4. favicon.ico — render at 16, 32, 48; combine
  for (const size of [16, 32, 48]) {
    await renderTile(size, path.join(TMP_DIR, `favicon-${size}.png`));
  }
  const buffers = await Promise.all(
    [16, 32, 48].map((s) => readFile(path.join(TMP_DIR, `favicon-${s}.png`))),
  );
  const ico = await pngToIco(buffers);
  await writeFile(path.join(APP_DIR, "icon.ico"), ico);

  console.log("Brand assets written to", APP_DIR);
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Add `tsx` script to package.json**

Open `apps/web/package.json`, add to `scripts`:

```json
"build:brand": "tsx scripts/build-brand-assets.ts"
```

- [ ] **Step 3: Run the script**

```bash
pnpm -F @jobcopilot/web build:brand
```

Expected output: `Brand assets written to .../apps/web/src/app`. Check that the four files exist:

```bash
ls apps/web/src/app/icon.svg apps/web/src/app/icon.ico apps/web/src/app/apple-icon.png apps/web/src/app/opengraph-image.png
```

- [ ] **Step 4: Verify the OG image visually**

Open `apps/web/src/app/opengraph-image.png` in an image viewer. Expect: dark background, Lockup top-left-ish, tagline below.

- [ ] **Step 5: Commit**

```bash
git add apps/web/scripts/build-brand-assets.ts apps/web/package.json apps/web/src/app/icon.svg apps/web/src/app/icon.ico apps/web/src/app/apple-icon.png apps/web/src/app/opengraph-image.png
git commit -m "feat(web): brand asset build script + generated favicon/apple/OG images"
```

> **Note:** if `apps/web/.brand-build/` ends up tracked by git, add it to `apps/web/.gitignore`. If `apps/web/.gitignore` doesn't exist, add the entry to root `.gitignore`.

---

## Task A21: Set up `@axe-core/playwright` and per-page axe tests

**Files:**
- Create: `apps/web/tests/e2e/axe.dashboard.spec.ts`
- Create: `apps/web/tests/e2e/axe.tracker.spec.ts`
- Create: `apps/web/tests/e2e/axe.application.spec.ts` (parameterized — uses google-referral fixture)
- Create: `apps/web/tests/e2e/axe.variants.spec.ts`
- Create: `apps/web/tests/e2e/axe.profile.spec.ts`
- Create: `apps/web/tests/e2e/axe.login.spec.ts`

- [ ] **Step 1: Create a shared helper**

Create `apps/web/tests/e2e/axe-helper.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function expectNoAxeViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect.soft(
    results.violations,
    `axe violations on ${label}:\n${JSON.stringify(results.violations, null, 2)}`,
  ).toEqual([]);
}
```

- [ ] **Step 2: Create `axe.dashboard.spec.ts`**

```ts
import { test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("dashboard has no axe violations", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await expectNoAxeViolations(page, "/dashboard");
});
```

- [ ] **Step 3: Create the other five axe specs (same pattern)**

`axe.tracker.spec.ts`:
```ts
import { test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("tracker has no axe violations", async ({ page }) => {
  await page.goto("/tracker");
  await page.waitForLoadState("networkidle");
  await expectNoAxeViolations(page, "/tracker");
});
```

`axe.variants.spec.ts`, `axe.profile.spec.ts` — analogous.

`axe.login.spec.ts` — note login is unauthenticated; it will work because `auth.setup.ts` runs first but the actual login route is publicly accessible. If tests fail, drop the `dependencies: ['setup']` for this one or run unauthenticated:

```ts
import { test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test.use({ storageState: { cookies: [], origins: [] } });

test("login has no axe violations", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await expectNoAxeViolations(page, "/login");
});
```

`axe.application.spec.ts` — needs to land on an applications/[id] page. Reuse the google-referral fixture path:

```ts
import { test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

test("applications/[id] has no axe violations", async ({ page }) => {
  // Land on tracker, click any existing card. If none exist, create via the
  // mock fixture (mirrors google-referral.spec.ts setup).
  await page.goto("/tracker");
  const card = page.locator("[href^='/applications/']").first();
  if (await card.count() === 0) {
    await page.getByRole("button", { name: /Add application/i }).click();
    await page.getByLabel(/Job posting URL/i).fill("http://localhost:3000/api/test-mock/google-fixture");
    await page.getByRole("button", { name: /Extract \+ create/i }).click();
    await page.waitForURL(/\/applications\/[0-9a-f-]+$/, { timeout: 30_000 });
  } else {
    await card.click();
    await page.waitForURL(/\/applications\/[0-9a-f-]+$/);
  }
  await page.waitForLoadState("networkidle");
  await expectNoAxeViolations(page, "/applications/[id]");
});
```

- [ ] **Step 4: Run the axe suite (expect failures pre-redesign — we're seeding the gates)**

```bash
pnpm -F @jobcopilot/web test:e2e -- tests/e2e/axe
```

> **Expected during Phase A:** SOME of these may already be green. Any that fail because of pre-existing violations should be tracked as gates that subsequent phases (B–G) bring into compliance. Do NOT fix unrelated a11y issues in Phase A — let each phase's owner remediate during their refactor.

- [ ] **Step 5: Commit**

```bash
git add apps/web/tests/e2e/axe-helper.ts apps/web/tests/e2e/axe.*.spec.ts
git commit -m "test(web): add per-page axe a11y suite via @axe-core/playwright"
```

---

## Task A22: Phase A acceptance — run full suite

- [ ] **Step 1: Lint, typecheck, unit tests**

```bash
pnpm -F @jobcopilot/web lint && pnpm -F @jobcopilot/web typecheck && pnpm -F @jobcopilot/web test
```

Expected: all green.

- [ ] **Step 2: Run the existing e2e ship-criterion test**

```bash
pnpm -F @jobcopilot/web test:e2e -- tests/e2e/google-referral.spec.ts
```

Expected: green. (Phase A token swap should not regress functionality.)

- [ ] **Step 3: Manual smoke**

Run `pnpm -F @jobcopilot/web dev` and visit `/dashboard`, `/tracker`, `/applications/[id]` (any), `/variants`, `/profile`, `/login`. Each should:
- Render without console errors
- Show new fonts (Geist for sidebar Lockup, Inter for body)
- Show drifting orbs in background
- Show the gradient `copilot` portion of the wordmark
- Have a working ThemeToggle in the sidebar

- [ ] **Step 4: Tag Phase A as foundation-ready**

```bash
git tag phase-a-complete
```

Phase A is done. Phases B–G can now be dispatched in parallel.

---

# Phase B — Tracker

**Touches:** `apps/web/src/app/(app)/tracker/page.tsx`, `kanban-board.tsx`, `application-card.tsx`. Does NOT touch any layout, primitive, or other page.

## Task B1: Refactor `application-card.tsx` to Card primitive

**Files:**
- Modify: `apps/web/src/components/application-card.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  title: string;
  company: string;
  updatedAt: string;
}

export function ApplicationCard({ id, title, company, updatedAt }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing touch-none select-none",
        isDragging && "opacity-50",
      )}
    >
      <Card className="bg-card/80 hover:bg-card transition-colors">
        <CardContent className="p-3 text-sm">
          <Link
            href={`/applications/${id}`}
            className="font-medium truncate block hover:underline"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {title}
          </Link>
          <div className="text-xs text-muted-foreground truncate">{company}</div>
          <div className="mt-2 text-xs text-muted-foreground font-mono">
            {new Date(updatedAt).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm -F @jobcopilot/web typecheck
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/application-card.tsx
git commit -m "feat(web): tracker — refactor ApplicationCard to Card primitive"
```

---

## Task B2: Refactor `kanban-board.tsx` — column headers + DragOverlay + empty states

**Files:**
- Modify: `apps/web/src/components/kanban-board.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  DndContext, DragOverlay,
  type DragEndEvent, type DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable,
} from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApplicationCard } from "./application-card";
import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@jobcopilot/shared";
import { APPLICATION_STATUSES } from "@jobcopilot/shared";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  phone_screen: "Phone screen",
  onsite: "Onsite",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
};

const EMPTY_HINTS: Record<ApplicationStatus, string> = {
  wishlist: "no applications saved yet",
  applied: "no applications in this stage",
  phone_screen: "no phone screens scheduled",
  onsite: "no onsites scheduled",
  offer: "no offers yet",
  rejected: "no rejections logged",
  ghosted: "no ghostings logged",
};

interface AppRow {
  id: string;
  status: ApplicationStatus;
  lastActivityAt: string;
  jobPosting: { title: string; company: string };
}

function KanbanColumn({ status, cards }: { status: ApplicationStatus; cards: AppRow[] }) {
  const { setNodeRef } = useDroppable({ id: status });
  return (
    <div className="min-w-[200px] space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          {STATUS_LABELS[status]}
        </div>
        <Badge variant="outline" className="font-mono text-[10px]">{cards.length}</Badge>
      </div>
      <SortableContext items={cards.map((a) => a.id)} id={status}>
        <div
          ref={setNodeRef}
          className="space-y-2 rounded-lg bg-secondary/20 p-2 min-h-[120px] transition-colors"
        >
          {cards.length === 0 ? (
            <div className="flex h-[100px] items-center justify-center rounded-md border border-dashed border-border/50">
              <span className="font-sans text-xs italic text-muted-foreground/60">
                {EMPTY_HINTS[status]}
              </span>
            </div>
          ) : (
            cards.map((a) => (
              <ApplicationCard
                key={a.id}
                id={a.id}
                title={a.jobPosting.title}
                company={a.jobPosting.company}
                updatedAt={a.lastActivityAt}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function resolveTargetStatus(e: DragEndEvent): ApplicationStatus | null {
  const overId = e.over?.id;
  if (!overId) return null;
  if (APPLICATION_STATUSES.includes(overId as ApplicationStatus)) return overId as ApplicationStatus;
  const containerId = e.over?.data.current?.sortable?.containerId as string | undefined;
  if (containerId && APPLICATION_STATUSES.includes(containerId as ApplicationStatus)) {
    return containerId as ApplicationStatus;
  }
  return null;
}

export function KanbanBoard() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const qc = useQueryClient();
  const { data: apps = [], isLoading, isError } = useQuery<AppRow[]>({
    queryKey: ["applications"],
    queryFn: async () => {
      const r = await fetch("/api/applications");
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ApplicationStatus }) => {
      const r = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("update failed");
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["applications"] });
      const prev = qc.getQueryData<AppRow[]>(["applications"]);
      qc.setQueryData<AppRow[]>(["applications"], (cur = []) =>
        cur.map((a) => (a.id === id ? { ...a, status } : a)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["applications"], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const grouped = useMemo(() => {
    const map = new Map<ApplicationStatus, AppRow[]>();
    for (const s of APPLICATION_STATUSES) map.set(s, []);
    for (const a of apps) map.get(a.status)?.push(a);
    return map;
  }, [apps]);

  const activeApp = activeId ? apps.find((a) => a.id === activeId) : null;

  function onDragStart(e: DragStartEvent) { setActiveId(e.active.id as string); }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const targetStatus = resolveTargetStatus(e);
    const draggedId = e.active.id as string;
    if (!targetStatus) return;
    const active = apps.find((a) => a.id === draggedId);
    if (!active || active.status === targetStatus) return;
    updateStatus({ id: draggedId, status: targetStatus });
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading applications…</div>;
  }
  if (isError) {
    return <div className="flex items-center justify-center py-16 text-destructive text-sm">Failed to load applications. Please refresh and try again.</div>;
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-7 gap-3 overflow-x-auto pb-2">
        {APPLICATION_STATUSES.map((status) => (
          <KanbanColumn key={status} status={status} cards={grouped.get(status) ?? []} />
        ))}
      </div>
      <DragOverlay>
        {activeApp ? (
          <div
            style={{ transform: "scale(1.02) rotate(1deg)" }}
            className="shadow-2xl shadow-[hsl(var(--brand-violet)/.4)]"
          >
            <ApplicationCard
              id={activeApp.id}
              title={activeApp.jobPosting.title}
              company={activeApp.jobPosting.company}
              updatedAt={activeApp.lastActivityAt}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

- [ ] **Step 2: Manual smoke — verify drag still works**

```bash
pnpm -F @jobcopilot/web dev
```

Open `/tracker`. Verify:
- Columns show monospace uppercase labels with count badges
- Empty columns show italicized hint text
- Drag a card from one column to another. The dragged preview should look "lifted" (scale + rotate + shadow).
- Drop succeeds, card lands in target column

- [ ] **Step 3: Run e2e ship test**

```bash
pnpm -F @jobcopilot/web test:e2e -- tests/e2e/google-referral.spec.ts
```

Expected: green (whole-card-drag preserved).

- [ ] **Step 4: Run axe gate**

```bash
pnpm -F @jobcopilot/web test:e2e -- tests/e2e/axe.tracker.spec.ts
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/kanban-board.tsx
git commit -m "feat(web): tracker — column label/badge headers, ghost empty states, lifted DragOverlay"
```

---

## Task B3: Phase B acceptance

- [ ] Run `pnpm -F @jobcopilot/web test && pnpm -F @jobcopilot/web typecheck && pnpm -F @jobcopilot/web test:e2e -- tests/e2e/google-referral tests/e2e/axe.tracker`. All green. Tag `phase-b-complete`.

---

# Phase C — Application detail

**Touches:** `application-detail-tabs.tsx`, `cover-letter-drafter.tsx`, `bullet-suggester.tsx`, `add-application-dialog.tsx`, `app/(app)/applications/[id]/page.tsx`. Does NOT touch layout, primitives, or other pages.

## Task C1: Refactor `application-detail-tabs.tsx` — preserve `forceMount`, replace hardcoded greens

**Files:**
- Modify: `apps/web/src/components/application-detail-tabs.tsx`

- [ ] **Step 1: Replace inline `rounded-lg border border-border bg-card p-4` containers with Card**

For each `<section className="rounded-lg border border-border bg-card p-4">` in `OverviewTab` (lines 129, 139, 150, 162, 172) — replace with:

```tsx
<Card className="p-4 space-y-2">
  <h2 className="text-sm font-semibold text-foreground">{/* heading */}</h2>
  {/* body unchanged */}
</Card>
```

Add `import { Card } from "@/components/ui/card";` to the top of the file.

For each contact wrapper at line 184 `<div className="rounded-md border border-border p-3">` — leave as-is (it's nested within a Card; adding another Card would double-border).

- [ ] **Step 2: Replace hardcoded green colors with token equivalents**

Line 254: `<span className="text-sm text-green-600 dark:text-green-400">Saved!</span>` → `<span className="text-sm text-success">Saved!</span>`.

Lines 300-301: 
```tsx
<span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
  Finalized
</span>
```
→
```tsx
<Badge variant="success">Finalized</Badge>
```

Add `import { Badge } from "@/components/ui/badge";` if not present.

For the `v{draft.version}` pill at line 296-298:
```tsx
<span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">v{draft.version}</span>
```
→
```tsx
<Badge variant="secondary" className="font-mono text-[10px]">v{draft.version}</Badge>
```

- [ ] **Step 3: Verify `forceMount` is unchanged**

Confirm lines for cover-letter and resume `<TabsContent>` still read:

```tsx
<TabsContent value="cover-letter" forceMount className="data-[state=inactive]:hidden">
  <CoverLetterDrafter application={application} variants={variants} />
</TabsContent>

<TabsContent value="resume" forceMount className="data-[state=inactive]:hidden">
  <BulletSuggester application={application} variants={variants} />
</TabsContent>
```

Do NOT remove `forceMount` or `data-[state=inactive]:hidden`.

- [ ] **Step 4: Run unit tests + typecheck**

```bash
pnpm -F @jobcopilot/web typecheck && pnpm -F @jobcopilot/web test
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/application-detail-tabs.tsx
git commit -m "feat(web): app-detail — Card primitive, success Badge, preserved forceMount"
```

---

## Task C2: Refactor `cover-letter-drafter.tsx` — gradient button, GlassCard panel, Button chips

**Files:**
- Modify: `apps/web/src/components/cover-letter-drafter.tsx`

- [ ] **Step 1: Update imports**

```tsx
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GlassCard } from "@/components/brand/glass-card";
```

- [ ] **Step 2: Replace the editor section wrapper (line 113)**

Replace `<section className="col-span-2 space-y-4 rounded-lg border border-border bg-card p-6">` with:

```tsx
<Card className="col-span-2">
  <CardContent className="space-y-4 p-6">
```

And update the closing `</section>` to `</CardContent></Card>`.

- [ ] **Step 3: Replace the AI panel wrapper (line 141)**

Replace `<section className="space-y-4 rounded-lg border border-border bg-card p-6">` with:

```tsx
<GlassCard>
  <div className="space-y-4 p-6">
```

And update the closing `</section>` to `</div></GlassCard>`.

- [ ] **Step 4: Replace the "Finalized" pill (line 119-121)**

```tsx
{currentDraft?.finalized && (
  <Badge variant="success">Finalized</Badge>
)}
```

Drop the existing `<span className="rounded-full bg-accent px-2 py-0.5 ...">Finalized</span>`.

- [ ] **Step 5: Update primary "Draft" button (line 165) to gradient variant**

```tsx
<Button
  className="w-full"
  variant="gradient"
  onClick={() => void draft()}
  disabled={busyAction !== null || !variantId}
>
  {busyAction === "draft" ? "Drafting..." : localLetters.length ? "Regenerate" : "Draft"}
</Button>
```

- [ ] **Step 6: Replace alternate-opening `<button>` chips (line 175)**

```tsx
{alternates.map((alt, i) => (
  <Button
    key={i}
    variant="ghost"
    size="sm"
    className="block h-auto w-full justify-start whitespace-normal text-left text-xs"
    onClick={() =>
      setEditedBody((body) => {
        const rest = body.split("\n").slice(1).join("\n");
        return alt + (rest ? "\n" + rest : "");
      })
    }
  >
    {alt}
  </Button>
))}
```

- [ ] **Step 7: Replace version-picker `<button>` chips (line 195)**

```tsx
{localLetters.map((d) => (
  <Button
    key={d.id}
    variant="ghost"
    size="sm"
    className="block h-auto w-full justify-start text-left text-xs"
    onClick={() => setCurrentDraft(d)}
  >
    v{d.version} {d.finalized ? " · final" : ""} · {new Date(d.createdAt).toLocaleString()}
  </Button>
))}
```

- [ ] **Step 8: Run e2e ship test**

```bash
pnpm -F @jobcopilot/web test:e2e -- tests/e2e/google-referral.spec.ts
```

Expected: green. (The "Draft" / "Finalize" buttons + `Dear Google team` / `Finalized` text expectations all still match because labels and text content are unchanged.)

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/cover-letter-drafter.tsx
git commit -m "feat(web): drafter — gradient Generate, GlassCard panel, Button chips"
```

---

## Task C3: Refactor `bullet-suggester.tsx` — same treatment

**Files:**
- Modify: `apps/web/src/components/bullet-suggester.tsx`

- [ ] **Step 1: Read the file first to understand its current shape**

```bash
# Subagent: read apps/web/src/components/bullet-suggester.tsx end-to-end before editing.
```

- [ ] **Step 2: Apply the same patterns as Task C2**

For every:
- Outer `<section className="rounded-lg border border-border bg-card ...">` → `<Card>` or `<GlassCard>` (use Card for editor, GlassCard for AI panel — match the layout role)
- Primary "Suggest" / "Generate" button → `variant="gradient"`
- Raw `<button>` chips → `<Button variant="ghost" size="sm">`
- Hardcoded `bg-green-*` / `text-green-*` → token equivalents

- [ ] **Step 3: Run e2e ship test**

```bash
pnpm -F @jobcopilot/web test:e2e -- tests/e2e/google-referral.spec.ts
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/bullet-suggester.tsx
git commit -m "feat(web): suggester — gradient Generate, GlassCard panel, Button chips"
```

---

## Task C4: Update `app/(app)/applications/[id]/page.tsx` — hero strip layout

**Files:**
- Modify: `apps/web/src/app/(app)/applications/[id]/page.tsx`

- [ ] **Step 1: Read the file first**

```bash
# Subagent: read apps/web/src/app/(app)/applications/[id]/page.tsx end-to-end. Identify the existing role/company/status display and the URL of the application's `jobUrl` field.
```

- [ ] **Step 2: Add a hero-strip section above the tabs render**

Pattern (adapt to actual data shape):

```tsx
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import type { ApplicationStatus } from "@jobcopilot/shared";

const STATUS_BADGE: Record<ApplicationStatus, "default" | "success" | "destructive" | "secondary"> = {
  wishlist: "secondary",
  applied: "default",
  phone_screen: "default",
  onsite: "default",
  offer: "success",
  rejected: "destructive",
  ghosted: "destructive",
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  phone_screen: "Phone screen",
  onsite: "Onsite",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
};

// In the JSX, above <ApplicationDetailTabs />:
<header className="mb-6 space-y-2">
  <p className="font-sans text-sm text-muted-foreground/70">
    {application.jobPosting.company}
  </p>
  <h1 className="font-display text-2xl font-semibold tracking-tight">
    {application.jobPosting.title}
  </h1>
  <div className="flex items-center gap-3">
    <Badge variant={STATUS_BADGE[application.status as ApplicationStatus]}>
      {STATUS_LABEL[application.status as ApplicationStatus]}
    </Badge>
    {application.jobPosting.url ? (
      <a
        href={application.jobPosting.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        Job posting <ArrowUpRight className="size-3" />
      </a>
    ) : null}
  </div>
</header>
```

> If the actual prop names differ (`application.jobUrl` vs `application.jobPosting.url`, etc.), adjust to match the existing schema. The schema is in `packages/shared/src/types.ts` (read first, then write).

- [ ] **Step 3: Run e2e ship test**

```bash
pnpm -F @jobcopilot/web test:e2e -- tests/e2e/google-referral.spec.ts
```

Expected: green. The test asserts `getByRole("heading", { name: /Applications Engineer/i })` — our `<h1>` carries that name.

- [ ] **Step 4: Run axe gate**

```bash
pnpm -F @jobcopilot/web test:e2e -- tests/e2e/axe.application.spec.ts
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(app)/applications/[id]/page.tsx
git commit -m "feat(web): app-detail — hero strip with company/role/status/jobUrl"
```

---

## Task C5: Phase C acceptance

- [ ] Run `pnpm -F @jobcopilot/web test && pnpm -F @jobcopilot/web typecheck && pnpm -F @jobcopilot/web test:e2e -- tests/e2e/google-referral tests/e2e/axe.application`. All green. Tag `phase-c-complete`.

---

# Phase D — Dashboard

**Touches:** `apps/web/src/app/(app)/dashboard/page.tsx` only.

## Task D1: Refactor `/dashboard` page

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import { prisma } from "@jobcopilot/db";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/brand/animated-number";

export default async function DashboardPage() {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const [total, applied, interviewing, offer] = await Promise.all([
    prisma.application.count({ where: { userId: data.user.id } }),
    prisma.application.count({ where: { userId: data.user.id, status: "applied" } }),
    prisma.application.count({
      where: { userId: data.user.id, status: { in: ["phone_screen", "onsite"] } },
    }),
    prisma.application.count({ where: { userId: data.user.id, status: "offer" } }),
  ]);

  const inProgress = applied + interviewing;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {total} {total === 1 ? "application" : "applications"}
        {" · "}
        <span className="text-muted-foreground">{inProgress} in progress</span>
      </h1>
      <div className="grid grid-cols-4 gap-4">
        <Stat label="Total" value={total} />
        <Stat label="Applied" value={applied} />
        <Stat label="Interviewing" value={interviewing} />
        <Stat label="Offers" value={offer} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-2 font-mono text-3xl font-semibold tabular-nums">
          <AnimatedNumber value={value} flagKey="jobcopilot:dashboard_seen" />
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Run typecheck + dev smoke**

```bash
pnpm -F @jobcopilot/web typecheck
```

Open `/dashboard`. First load: counters animate from 0. Reload: counters render instantly (sessionStorage flag set). Open in a new tab: counters animate again (new session).

- [ ] **Step 3: Run axe gate**

```bash
pnpm -F @jobcopilot/web test:e2e -- tests/e2e/axe.dashboard.spec.ts
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(app)/dashboard/page.tsx
git commit -m "feat(web): dashboard — Stat cards, AnimatedNumber, data-driven H1"
```

---

# Phase E — Variants

**Touches:** `apps/web/src/app/(app)/variants/page.tsx` only.

## Task E1: Refactor `/variants` page

**Files:**
- Modify: `apps/web/src/app/(app)/variants/page.tsx`

- [ ] **Step 1: Read the file first to identify CRUD shape**

```bash
# Subagent: read apps/web/src/app/(app)/variants/page.tsx end-to-end before editing. Note where variants render and where the "create variant" affordance is.
```

- [ ] **Step 2: Apply the visual treatment**

- Replace each variant rendering wrapper with `<Card>...<CardContent>...`
- Render variants in `grid grid-cols-1 md:grid-cols-2 gap-4`
- Render the "+ New variant" tile **last** in the grid, with:
  ```tsx
  <Card className="border-dashed border-border/60 hover:border-primary/40 transition-colors cursor-pointer">
    <CardContent className="flex h-full min-h-[120px] items-center justify-center">
      <span className="text-sm text-muted-foreground">+ New variant</span>
    </CardContent>
  </Card>
  ```
  Wrap with the existing onClick / Link logic.

- [ ] **Step 3: Run e2e + axe gate**

```bash
pnpm -F @jobcopilot/web test && pnpm -F @jobcopilot/web test:e2e -- tests/e2e/axe.variants.spec.ts
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(app)/variants/page.tsx
git commit -m "feat(web): variants — 2-col Card grid with '+ New variant' last tile"
```

---

# Phase F — Profile

**Touches:** `apps/web/src/app/(app)/profile/page.tsx` only.

## Task F1: Refactor `/profile` page

**Files:**
- Modify: `apps/web/src/app/(app)/profile/page.tsx`

- [ ] **Step 1: Read the file first**

```bash
# Subagent: read apps/web/src/app/(app)/profile/page.tsx end-to-end. Note: existing upload UI, parsed-skills array shape, and how missing skills are currently handled.
```

- [ ] **Step 2: Add badge-pulse keyframe to globals.css**

Append to `apps/web/src/app/globals.css`:

```css
@keyframes badge-pulse {
  0% { opacity: .6; }
  50% { opacity: 1; }
  100% { opacity: .6; }
}
.animate-badge-pulse {
  animation: badge-pulse 1.6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .animate-badge-pulse { animation: none; opacity: 1; }
}
```

- [ ] **Step 3: Apply two-column layout + states**

Pseudocode skeleton (adapt to actual prop names + Server Component shape):

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { GlassCard } from "@/components/brand/glass-card";
import { Badge } from "@/components/ui/badge";

// In the page body:
<div className="grid gap-6 md:grid-cols-[280px_1fr]">
  {/* Identity card (left) */}
  <Card>
    <CardContent className="p-6">
      {/* avatar / email / name — keep existing content */}
    </CardContent>
  </Card>

  {/* Right column */}
  <div className="space-y-6">
    {hasResumeUploaded && skillsExtracted ? (
      <Card>
        <CardContent className="p-6">
          <h2 className="font-display text-lg font-semibold mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <Badge key={s} variant="secondary">{s}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    ) : hasResumeUploaded && !skillsExtracted ? (
      <Card>
        <CardContent className="p-6">
          <Badge variant="secondary" className="animate-badge-pulse">
            Extracting skills…
          </Badge>
        </CardContent>
      </Card>
    ) : (
      <GlassCard>
        <div className="p-6">
          {/* existing upload affordance — Input type="file", form post, etc. */}
        </div>
      </GlassCard>
    )}
  </div>
</div>
```

- [ ] **Step 4: Run axe gate**

```bash
pnpm -F @jobcopilot/web test:e2e -- tests/e2e/axe.profile.spec.ts
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(app)/profile/page.tsx apps/web/src/app/globals.css
git commit -m "feat(web): profile — two-col layout, defined empty/extracting states, GlassCard upload"
```

---

# Phase G — Login

**Touches:** `apps/web/src/app/(auth)/login/page.tsx` only.

## Task G1: Refactor `/login` page

**Files:**
- Modify: `apps/web/src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Read the file first**

```bash
# Subagent: read apps/web/src/app/(auth)/login/page.tsx end-to-end. Note current Google + GitHub button implementations and any existing supabase signInWithOAuth calls.
```

- [ ] **Step 2: Apply centered Lockup hero + gradient OAuth buttons**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Lockup } from "@/components/brand/lockup";
import { OrbBackground } from "@/components/brand/orb-background";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = getBrowserSupabase();

  async function signIn(provider: "google" | "github") {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-8">
      <OrbBackground />
      <div className="relative z-10 w-full max-w-sm space-y-6 text-center">
        <div className="flex justify-center">
          <Lockup logoSize={56} wordSize={40} gap={16} />
        </div>
        <p className="text-sm text-muted-foreground">
          AI drafts every piece of an application. You review and ship.
        </p>
        <div className="space-y-3">
          <Button variant="gradient" className="w-full" onClick={() => signIn("google")}>
            Continue with Google
          </Button>
          <Button variant="outline" className="w-full" onClick={() => signIn("github")}>
            Continue with GitHub
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run axe gate + manual smoke**

```bash
pnpm -F @jobcopilot/web test:e2e -- tests/e2e/axe.login.spec.ts
```

Expected: green. Manually verify clicking either button starts an OAuth flow.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(auth)/login/page.tsx
git commit -m "feat(web): login — centered Lockup hero, OrbBackground, gradient OAuth buttons"
```

---

# Phase H — Motion + transitions

**Touches:** `app/(app)/layout.tsx` only.

## Task H1: Wrap `(app)` route group with `<PageTransition>`

**Files:**
- Modify: `apps/web/src/app/(app)/layout.tsx`

- [ ] **Step 1: Read the file first**

```bash
# Subagent: read apps/web/src/app/(app)/layout.tsx end-to-end. Confirm it currently renders <AppShell>{children}</AppShell> or similar.
```

- [ ] **Step 2: Wrap children with PageTransition**

Adapt the file. Example shape:

```tsx
import { AppShell } from "@/components/app-shell";
import { PageTransition } from "@/components/brand/page-transition";
import { QueryProvider } from "@/components/query-provider"; // or wherever the existing TanStack Query provider lives

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AppShell>
        <PageTransition>{children}</PageTransition>
      </AppShell>
    </QueryProvider>
  );
}
```

> If `(app)/layout.tsx` is currently a Server Component that doesn't import client providers, the existing structure stays — `<PageTransition>` is a Client Component that takes children, so it can wrap server-rendered children.

- [ ] **Step 3: Manual smoke — verify route fades**

Run dev server, navigate `/dashboard → /tracker → /variants`. Each transition should cross-fade with a 4px translate. Should NOT trigger full-page reload.

- [ ] **Step 4: Verify reduce-motion behavior**

In Chrome DevTools, emulate `prefers-reduced-motion: reduce`. Navigate again. Transitions should be instant; orbs hidden. Stat counters should render their final value without animation.

- [ ] **Step 5: Run all tests**

```bash
pnpm -F @jobcopilot/web test && pnpm -F @jobcopilot/web typecheck && pnpm -F @jobcopilot/web test:e2e
```

Expected: full suite green.

- [ ] **Step 6: Commit + tag feature-complete**

```bash
git add apps/web/src/app/(app)/layout.tsx
git commit -m "feat(web): wrap (app) route group with PageTransition"
git tag feature-complete
```

---

# Phase I — Demo recording (owner: Ethan, async)

## Task I1: README link update

**Owner:** Ethan (manual).

**Files:**
- Modify: `README.md`

- [ ] **Step 1 (Ethan, manual):** Record a 30-60s screen capture of drafting + submitting an application via the redesigned app. Tools: built-in OS recorder, OBS, or similar. Export as MP4.

- [ ] **Step 2 (Ethan, manual):** Create a new GitHub release on the repo (`gh release create vX.Y.Z-redesign --notes "UI redesign demo"`). Upload the MP4 as a release asset.

- [ ] **Step 3 (Subagent or Ethan):** Once Ethan provides the release asset URL, update `README.md`:

Add at the top after the title:

```markdown
> [Watch the 60-second demo](https://github.com/<owner>/<repo>/releases/download/<tag>/jobcopilot-demo.mp4)
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(readme): add demo recording link"
```

---

# Self-review checklist (run after writing this plan)

**Spec coverage** — every section of `2026-05-05-ui-redesign-design.md` traces to at least one task:

- §3 Visual identity → Logo (A7), Wordmark (A8), Lockup (A9)
- §4 Color tokens → A2 (globals.css), A3 (tailwind.config.ts)
- §4 Typography → A5 (next/font registration)
- §4 Radius → A2 + A3
- §4 Motion principles → A2 (reduce-motion), A11 (AnimatedNumber gating), A13 (PageTransition), F1 (badge-pulse), H1 (route transitions)
- §5 Primitives — refactor existing → A14 (Card/Badge), A15 (Button gradient), A17 (Tabs), A18 (Dialog)
- §5 Primitives — new brand → A7-A13, A16 (GlassCard)
- §5 Theme infra → A1 (next-themes install), A4 (ThemeProvider), A5 (layout integration), A12 (ThemeToggle)
- §5 App component refactors → A19 (app-shell), B1-B2 (kanban + card), C1-C3 (detail-tabs + drafter + suggester)
- §6 Page treatments → B (tracker), C4 (applications/[id] hero), D1 (dashboard), E1 (variants), F1 (profile), G1 (login)
- §7 Brand assets → A20 (build script + asset generation)
- §8 Phasing — Phase A consolidation → A1-A22; Phases B-G touch only owned files; Phase H final layout wrap
- §9 Risks → all explicit per-phase gates address them
- §10 Out of scope → no tasks for native `<select>` / state-management / typing hardening

**Placeholder scan** — searched for `TBD`, `TODO`, `implement later`, `add appropriate ...`. Two tasks reference "Read the file first" before editing (Tasks C3, C4, E1, F1, G1, H1) — that is a deliberate "read consuming code" instruction per project memory rule, not a placeholder; the surrounding patterns and specific edit instructions make the actual changes concrete.

**Type consistency** — `AnimatedNumber` props: `{ value: number; flagKey: string; durationMs?: number; className?: string }` consistent across A11 + D1. `Lockup` props consistent across A9 / A19 / G1. `ThemeToggle` className optional consistent across A12 + A19.

---

## Execution handoff

**Plan complete and saved to `docs/plans/2026-05-05-ui-redesign.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Phase A subagents run serially; after Phase A tag lands, Phases B/D/E/F/G subagents can dispatch in parallel. Phase C runs serially after C1 (since C1-C4 share the application detail flow).

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
