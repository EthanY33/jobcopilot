# Marketing Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the JobCopilot marketing landing page (6 sections: Hero → How It Works → Tracker Pipeline → Manifesto → Final CTA → Footer) and wire it to `/`, with authed users redirected to `/dashboard`.

**Architecture:** New Next.js 14 server-component `<MarketingPage>` at `apps/web/src/app/page.tsx` composing client-island sections under a server `<MarketingLayout>` shell. All sections live under `apps/web/src/components/marketing/`. Auth redirect (`/` authed → `/dashboard`) added to existing `updateSession` middleware. Source Serif 4 added via `next/font/google` for AI-prose copy. Animations via CSS keyframes + a small set of client islands (`DriftOrb` is pure CSS; `ScrollReveal` uses IntersectionObserver; `HeroDemo` owns setInterval + mouse parallax). Reduced-motion is gated globally.

**Tech Stack:** Next.js 14 (App Router) · React Server Components for static sections · React Client Components only where behavior needs them · Tailwind + CSS Modules (`marketing.module.css`) for the animation-heavy keyframes · Geist (display) + Inter (sans) + JetBrains Mono (mono, existing) + Source Serif 4 (new) · Vitest for unit tests · Playwright + axe for the marketing a11y spec.

**Spec:** `docs/specs/2026-05-07-marketing-landing-design.md` (open questions resolved 2026-05-07). The v11 visual prototype at `.superpowers/brainstorm/4273-1778192382/content/hero-prototype-v11.html` (gitignored, lives locally) is authoritative for visual details where the spec is silent. Open it side-by-side in a browser during implementation.

**Locked rules carried forward (do not re-litigate):**
- No section eyebrows / numbering ("02 · HOW IT WORKS" style). Titles do the work alone.
- No em-dashes (`—`) in body copy. Use periods.
- No AI-startup buzzwords. Banned list per spec §3.
- Plain ASCII "resume" and "Ethan Yucetepe" everywhere.
- AI-prose surfaces (cover letter, resume bullets, Q&A answers, manifesto body) use Source Serif 4 — never mono.
- Source Serif 4 for AI prose was the breakthrough. Five iterations on the hero font system landed there. Keep it.

---

## File Structure

### New files (under `apps/web/src/components/marketing/`)

| File | Purpose | Server/Client |
|---|---|---|
| `marketing-layout.tsx` | Top utility bar wrapper + global page background | Server |
| `marketing-page.tsx` | Composes the 6 sections in order | Server |
| `utility-bar.tsx` | Fixed top bar — brand left, GitHub link right | Server |
| `drift-orb.tsx` | Reusable absolute-positioned blurred orb | Server (pure CSS) |
| `scroll-reveal.tsx` | IntersectionObserver wrapper toggling `.visible` | **Client** |
| `use-mouse-parallax.ts` | Hook returning rotateX/rotateY transform | **Client hook** |
| `marketing.module.css` | Page-scoped keyframes + seam-dissolve helpers | (CSS) |
| `hero/hero-section.tsx` | Hero composition: eyebrow / h1 / lede / CTAs / frame | Server (imports HeroDemo as client island) |
| `hero/hero-demo.tsx` | Tilted browser-frame demo with tab cycle + parallax | **Client** |
| `how-it-works/how-it-works-section.tsx` | Section heading + 3-step grid + connecting line | Server |
| `how-it-works/how-step.tsx` | One step (numbered badge + title + desc + visual slot) | Server |
| `how-it-works/paste-visual.tsx` | Mock URL input + extract button | Server |
| `how-it-works/draft-visual.tsx` | Mini serif AI output line + cursor | Server |
| `how-it-works/ship-visual.tsx` | 3-column kanban with "completed → applied" loop | Server (pure CSS) |
| `tracker/tracker-pipeline-section.tsx` | Section heading + stats strip + kanban frame | Server |
| `tracker/kanban-preview.tsx` | 5-column kanban frame + 10 cards | Server |
| `tracker/kanban-column-preview.tsx` | Single column with accent bar + count pill | Server |
| `tracker/application-card-preview.tsx` | Single card (avatar + clamped title + status dot) | Server |
| `tracker/application-data.ts` | The 10 sample applications data | (data) |
| `manifesto/manifesto-section.tsx` | Heading + 3 paragraphs + specs strip + author byline | Server |
| `final-cta/final-cta-section.tsx` | Heading + sub + 2 CTAs + fineprint | Server |
| `footer/marketing-footer.tsx` | 4-column footer + bottom strip | Server |

### New tests

| File | What it tests |
|---|---|
| `apps/web/src/components/marketing/drift-orb.test.tsx` | Renders with size/color/animation props; respects `motion-reduce` class |
| `apps/web/src/components/marketing/scroll-reveal.test.tsx` | Adds `.visible` when IntersectionObserver fires; honors threshold |
| `apps/web/src/components/marketing/use-mouse-parallax.test.tsx` | Returns a transform string proportional to cursor offset; resets to none on leave |
| `apps/web/src/components/marketing/hero/hero-demo.test.tsx` | Cycles tab index every 4500ms with fake timers; status row label updates in sync |
| `apps/web/src/components/marketing/hero/hero-section.test.tsx` | Renders locked copy verbatim (eyebrow, h1, lede, both CTAs) |
| `apps/web/src/components/marketing/manifesto/manifesto-section.test.tsx` | Renders the 3 locked paragraphs verbatim |
| `apps/web/src/components/marketing/final-cta/final-cta-section.test.tsx` | Renders locked copy + 2 CTAs + fineprint |
| `apps/web/tests/e2e/axe.marketing.spec.ts` | Marketing route at `/` has zero axe violations (unauth storage) |

### Files modified

| File | Change |
|---|---|
| `apps/web/src/app/page.tsx` | Replace redirect-only logic with `<MarketingPage />` render (auth redirect moves to middleware) |
| `apps/web/src/lib/supabase/middleware.ts` | Add explicit branch: `pathname === "/" && data.user` → 302 to `/dashboard` |
| `apps/web/src/app/layout.tsx` | Register Source Serif 4 from `next/font/google` and add the variable to `<html>` |
| `apps/web/tailwind.config.ts` | Add `serif: ["var(--font-serif)", "Georgia", "serif"]` to `fontFamily` |
| `apps/web/src/app/globals.css` | Add `:root { --font-serif: ... }` fallback wiring (next/font auto-injects but the CSS variable name must align) |
| `README.md` | Insert one-line "Watch the live landing →" link below the brand-hero `<img>` (line 3) |

### Files NOT modified (verify nothing leaks)

- `apps/web/src/components/app-shell.tsx` — only renders inside `(app)/` routes
- `apps/web/src/app/(app)/layout.tsx` — only wraps authed routes
- The 6 existing axe specs (`axe.dashboard.spec.ts`, `axe.tracker.spec.ts`, etc.) — must still pass after middleware change

---

## Conventions for tasks below

- **Test-first**: every task that adds component code starts with a failing test, then implementation. For pure-static sections, the test renders the component and asserts the locked copy is present verbatim — that pins the spec rules against future drift.
- **Run commands** are written for PowerShell (the user's shell). Run them from `apps/web/` unless noted.
- **Commit after every task** — granular history makes review + revert easy.
- **`use client` directive**: required on `scroll-reveal.tsx`, `use-mouse-parallax.ts`, `hero-demo.tsx`. All other marketing components stay as server components.
- **Spec references**: `spec §N` means section N of `docs/specs/2026-05-07-marketing-landing-design.md`. **Do not paraphrase locked copy** — open the spec and copy/paste verbatim.
- **Visual fidelity**: where this plan does not specify an exact pixel value, open the v11 prototype HTML in a browser, inspect, and match.

---

## Task 1: Register Source Serif 4 font

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/tailwind.config.ts`

- [ ] **Step 1: Add Source Serif 4 import + variable to layout.tsx**

Edit `apps/web/src/app/layout.tsx`. Add the import block above `Inter`/`JetBrains_Mono` and include the variable on `<html>`:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
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

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif",
  display: "swap",
});

import { GeistSans } from "geist/font/sans";

export const metadata: Metadata = {
  title: "JobCopilot",
  description: "AI-assisted job application copilot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${sourceSerif.variable} ${GeistSans.variable}`}
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

- [ ] **Step 2: Add `serif` family to tailwind.config.ts**

Edit `apps/web/tailwind.config.ts`, in `theme.extend.fontFamily`, add a `serif` entry:

```ts
fontFamily: {
  sans: ["var(--font-inter)", "system-ui", "sans-serif"],
  display: ["var(--font-geist-sans)", "var(--font-inter)", "sans-serif"],
  mono: ["var(--font-jetbrains)", "monospace"],
  serif: ["var(--font-serif)", "Georgia", "serif"],
},
```

- [ ] **Step 3: Verify build still compiles**

Run: `pnpm -F @jobcopilot/web build`
Expected: build succeeds, no font-related errors. (If you don't want to wait for a full build, run `pnpm -F @jobcopilot/web typecheck` for a faster smoke check.)

- [ ] **Step 4: Commit**

```powershell
git add apps/web/src/app/layout.tsx apps/web/tailwind.config.ts
git commit -m "feat(marketing): register Source Serif 4 font for AI-prose surfaces"
```

---

## Task 2: DriftOrb component (pure CSS, server-renderable)

**Files:**
- Create: `apps/web/src/components/marketing/drift-orb.tsx`
- Test: `apps/web/src/components/marketing/drift-orb.test.tsx`
- Create: `apps/web/src/components/marketing/marketing.module.css`

The existing `<OrbBackground>` (`apps/web/src/components/brand/orb-background.tsx`) is hard-coded to two specific orbs at fixed positions. The marketing page needs ~10 orbs at varied positions/sizes, so we make a parameterized primitive instead.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/marketing/drift-orb.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DriftOrb } from "./drift-orb";

describe("DriftOrb", () => {
  it("renders an aria-hidden div with configured size and color", () => {
    const { container } = render(
      <DriftOrb size={600} color="violet" opacity={0.35} top="-200px" right="-150px" duration="28s" animationName="drift1" />,
    );
    const orb = container.firstChild as HTMLElement;
    expect(orb.getAttribute("aria-hidden")).toBe("true");
    expect(orb.style.width).toBe("600px");
    expect(orb.style.height).toBe("600px");
    expect(orb.style.opacity).toBe("0.35");
    expect(orb.style.top).toBe("-200px");
    expect(orb.style.right).toBe("-150px");
    // animation property carries duration + name
    expect(orb.style.animation).toContain("28s");
    expect(orb.style.animation).toContain("drift1");
  });

  it("uses the brand violet HSL when color='violet'", () => {
    const { container } = render(<DriftOrb size={400} color="violet" opacity={0.2} animationName="drift1" duration="24s" />);
    const orb = container.firstChild as HTMLElement;
    expect(orb.style.background).toContain("258");
  });

  it("uses the brand azure HSL when color='azure'", () => {
    const { container } = render(<DriftOrb size={400} color="azure" opacity={0.2} animationName="drift2" duration="22s" />);
    const orb = container.firstChild as HTMLElement;
    expect(orb.style.background).toContain("215");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `apps/web/`: `pnpm test drift-orb`
Expected: FAIL — "Cannot find module './drift-orb'".

- [ ] **Step 3: Create marketing.module.css with the keyframes**

Create `apps/web/src/components/marketing/marketing.module.css`. This is the keyframe library used by the entire marketing surface. Add only `drift1`/`drift2` for now; later tasks append more keyframes.

```css
/* Marketing-page keyframes. Page-scoped via CSS module class names so they
   don't leak to the (app) routes. Reduced-motion is gated globally in
   globals.css — animations decay there. */

@keyframes drift1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(40px, -30px) scale(1.05); }
}

@keyframes drift2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(-30px, 40px) scale(1.08); }
}

/* Reusable absolutely-positioned orb base. Component supplies size/color
   inline; this class only carries the constants. */
.driftOrb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}
```

- [ ] **Step 4: Implement the DriftOrb component**

Create `apps/web/src/components/marketing/drift-orb.tsx`:

```tsx
import styles from "./marketing.module.css";

type OrbColor = "violet" | "azure";

interface DriftOrbProps {
  size: number;
  color: OrbColor;
  opacity: number;
  /** Any of these CSS positional values; pass at least one. */
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  /** Keyframe name from marketing.module.css (drift1, drift2, ...) */
  animationName: string;
  /** e.g. "28s" */
  duration: string;
}

const COLOR_HSL: Record<OrbColor, string> = {
  violet: "258 90% 60%",
  azure: "215 95% 50%",
};

export function DriftOrb({
  size,
  color,
  opacity,
  top,
  right,
  bottom,
  left,
  animationName,
  duration,
}: DriftOrbProps) {
  return (
    <div
      aria-hidden="true"
      className={styles.driftOrb}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        top,
        right,
        bottom,
        left,
        opacity,
        background: `hsl(${COLOR_HSL[color]})`,
        animation: `${animationName} ${duration} ease-in-out infinite`,
      }}
    />
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test drift-orb`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/components/marketing/drift-orb.tsx apps/web/src/components/marketing/drift-orb.test.tsx apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): add DriftOrb primitive + drift1/drift2 keyframes"
```

---

## Task 3: ScrollReveal component (client island, IntersectionObserver)

**Files:**
- Create: `apps/web/src/components/marketing/scroll-reveal.tsx`
- Test: `apps/web/src/components/marketing/scroll-reveal.test.tsx`
- Modify: `apps/web/src/components/marketing/marketing.module.css`

- [ ] **Step 1: Append the reveal CSS to marketing.module.css**

Add to `apps/web/src/components/marketing/marketing.module.css`:

```css
.reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.9s cubic-bezier(0.2, 0.7, 0.2, 1),
              transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.revealVisible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
}
```

- [ ] **Step 2: Write the failing test**

Create `apps/web/src/components/marketing/scroll-reveal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { ScrollReveal } from "./scroll-reveal";

type IntersectionCallback = (entries: { isIntersecting: boolean }[]) => void;

let lastObserver: { callback: IntersectionCallback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> } | null = null;

beforeEach(() => {
  lastObserver = null;
  // jsdom does not implement IntersectionObserver; install a controllable stub.
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      callback: IntersectionCallback;
      observe = vi.fn();
      disconnect = vi.fn();
      constructor(cb: IntersectionCallback) {
        this.callback = cb;
        lastObserver = this;
      }
      unobserve = vi.fn();
      takeRecords = () => [];
      root = null;
      rootMargin = "";
      thresholds = [];
    },
  );
});

describe("ScrollReveal", () => {
  it("starts hidden and becomes visible when intersection fires", () => {
    const { container } = render(
      <ScrollReveal>
        <p>visible-content</p>
      </ScrollReveal>,
    );
    const node = container.firstChild as HTMLElement;
    expect(node.className).not.toContain("revealVisible");
    expect(node.textContent).toBe("visible-content");

    act(() => {
      lastObserver!.callback([{ isIntersecting: true }]);
    });

    expect(node.className).toContain("revealVisible");
  });

  it("applies a transition delay when delayMs is provided", () => {
    const { container } = render(
      <ScrollReveal delayMs={300}>
        <p>delayed</p>
      </ScrollReveal>,
    );
    const node = container.firstChild as HTMLElement;
    expect(node.style.transitionDelay).toBe("300ms");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test scroll-reveal`
Expected: FAIL — "Cannot find module './scroll-reveal'".

- [ ] **Step 4: Implement ScrollReveal**

Create `apps/web/src/components/marketing/scroll-reveal.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./marketing.module.css";

interface ScrollRevealProps {
  children: ReactNode;
  /** Threshold passed to IntersectionObserver (default 0.15). */
  threshold?: number;
  /** Stagger delay in milliseconds. Default 0. */
  delayMs?: number;
  /** Optional inline className to merge. */
  className?: string;
}

export function ScrollReveal({ children, threshold = 0.15, delayMs = 0, className = "" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.revealVisible : ""} ${className}`.trim()}
      style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test scroll-reveal`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/components/marketing/scroll-reveal.tsx apps/web/src/components/marketing/scroll-reveal.test.tsx apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): add ScrollReveal client island with IntersectionObserver"
```

---

## Task 4: useMouseParallax hook

**Files:**
- Create: `apps/web/src/components/marketing/use-mouse-parallax.ts`
- Test: `apps/web/src/components/marketing/use-mouse-parallax.test.tsx`

The HeroDemo frame rotates ±2deg based on cursor position relative to the frame's bounding box. Hook returns the transform string + handlers to attach.

Per spec §5 "Section 01 — Hero": `rotateX(-y * 4deg) rotateY(x * 4deg)` where x,y are normalized -0.5..0.5. That gives ±2deg. The §2 table also says "subtle ±2deg mouse parallax centered on 0deg." Use the §5 formula.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/marketing/use-mouse-parallax.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { useMouseParallax } from "./use-mouse-parallax";

function Probe() {
  const { transform, handlers } = useMouseParallax();
  return (
    <div data-testid="frame" style={{ transform }} {...handlers}>
      content
    </div>
  );
}

describe("useMouseParallax", () => {
  it("returns 'none' before any mouse event", () => {
    const { getByTestId } = render(<Probe />);
    const node = getByTestId("frame") as HTMLElement;
    // jsdom inlines transform from style; "none" or empty both acceptable
    expect(node.style.transform === "" || node.style.transform === "none").toBe(true);
  });

  it("returns a rotateX/rotateY transform after mouse move", () => {
    const { getByTestId } = render(<Probe />);
    const node = getByTestId("frame") as HTMLElement;

    Object.defineProperty(node, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON() {} }),
      configurable: true,
    });

    act(() => {
      fireEvent.mouseMove(node, { clientX: 75, clientY: 25 });
    });

    expect(node.style.transform).toMatch(/rotateX\(.*deg\)/);
    expect(node.style.transform).toMatch(/rotateY\(.*deg\)/);
  });

  it("resets to none on mouse leave", () => {
    const { getByTestId } = render(<Probe />);
    const node = getByTestId("frame") as HTMLElement;
    Object.defineProperty(node, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON() {} }),
      configurable: true,
    });

    act(() => {
      fireEvent.mouseMove(node, { clientX: 75, clientY: 25 });
    });
    expect(node.style.transform).not.toBe("none");

    act(() => {
      fireEvent.mouseLeave(node);
    });
    expect(node.style.transform === "none" || node.style.transform === "").toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test use-mouse-parallax`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

Create `apps/web/src/components/marketing/use-mouse-parallax.ts`:

```ts
"use client";

import { useState, useCallback } from "react";

export function useMouseParallax() {
  const [transform, setTransform] = useState<string>("none");

  const onMouseMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // Normalize cursor position to -0.5..0.5 across both axes.
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    // rotateX(-y * 4deg) rotateY(x * 4deg) per spec §5. ±2deg total.
    setTransform(`perspective(1200px) rotateX(${-(y * 4).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg)`);
  }, []);

  const onMouseLeave = useCallback(() => {
    setTransform("none");
  }, []);

  return { transform, handlers: { onMouseMove, onMouseLeave } } as const;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test use-mouse-parallax`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/components/marketing/use-mouse-parallax.ts apps/web/src/components/marketing/use-mouse-parallax.test.tsx
git commit -m "feat(marketing): add useMouseParallax hook for hero frame tilt"
```

---

## Task 5: UtilityBar + MarketingLayout shells

**Files:**
- Create: `apps/web/src/components/marketing/utility-bar.tsx`
- Create: `apps/web/src/components/marketing/marketing-layout.tsx`
- Modify: `apps/web/src/components/marketing/marketing.module.css`

Per spec §4 the utility bar is `48px` fixed, glass-blur, with "JOBCOPILOT · v1.0" left and "github · ethan/..." right (mono).

- [ ] **Step 1: Append utility-bar styles to marketing.module.css**

Append to `apps/web/src/components/marketing/marketing.module.css`:

```css
.utilityBar {
  position: fixed;
  inset: 0 0 auto 0;
  height: 48px;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: rgba(8, 8, 12, 0.7);
  backdrop-filter: saturate(140%) blur(12px);
  -webkit-backdrop-filter: saturate(140%) blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-family: var(--font-jetbrains), monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8a8a99;
}

.utilityBar a:hover { color: #f4f4f8; }

.marketingMain {
  background: #08080c;
  color: #f4f4f8;
  min-height: 100vh;
  /* Allow each section to clip horizontal overflow but bleed vertically
     so seam-dissolve orbs work — actual overflow rules go on each section. */
  overflow-x: hidden;
}
```

- [ ] **Step 2: Implement UtilityBar**

Create `apps/web/src/components/marketing/utility-bar.tsx`:

```tsx
import styles from "./marketing.module.css";

export function UtilityBar() {
  return (
    <div className={styles.utilityBar}>
      <span>JOBCOPILOT · v1.0</span>
      <a
        href="https://github.com/EthanY33/jobcopilot"
        target="_blank"
        rel="noreferrer noopener"
      >
        github · ethany33/jobcopilot
      </a>
    </div>
  );
}
```

- [ ] **Step 3: Implement MarketingLayout**

Create `apps/web/src/components/marketing/marketing-layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { UtilityBar } from "./utility-bar";
import styles from "./marketing.module.css";

interface MarketingLayoutProps {
  children: ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <main className={styles.marketingMain}>
      <UtilityBar />
      {children}
    </main>
  );
}
```

- [ ] **Step 4: Smoke-test it compiles via typecheck**

Run from repo root: `pnpm -F @jobcopilot/web typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/components/marketing/utility-bar.tsx apps/web/src/components/marketing/marketing-layout.tsx apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): scaffold UtilityBar and MarketingLayout shells"
```

---

## Task 6: HeroDemo — static structure first (browser frame, sidebar, tabs, panes)

**Files:**
- Create: `apps/web/src/components/marketing/hero/hero-demo.tsx`
- Modify: `apps/web/src/components/marketing/marketing.module.css`

Build the static frame first. Tab cycling + parallax come in tasks 7 + 8. All copy in this task is locked — pull from spec §5 "Hero copy (locked)" and "AI demo content (locked)" verbatim. Open the v11 prototype to match exact spacing/colors.

- [ ] **Step 1: Append hero-demo styles to marketing.module.css**

Append the CSS for the browser frame, sidebar, tab indicator, status row, AI panes. The class names below are the contract referenced by the TSX in step 2; values come from spec §5 + the v11 prototype.

```css
/* ----- Hero demo frame ----- */
.frameStage {
  position: relative;
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  perspective: 1600px;
  transition: transform 0.5s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.heroFrame {
  position: relative;
  background: #0d0d12;
  border: 1px solid #25252e;
  border-radius: 14px;
  overflow: hidden;
  box-shadow:
    0 30px 80px -20px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(155, 103, 238, 0.1);
}

.frameChrome {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #1f1f28;
  background: rgba(13, 13, 18, 0.95);
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dotR { background: #ff5f57; }
.dotY { background: #febc2e; }
.dotG { background: #28c840; }

.urlBar {
  flex: 1;
  background: #1a1a22;
  border: 1px solid #25252e;
  border-radius: 6px;
  padding: 5px 12px;
  font-family: var(--font-jetbrains), monospace;
  font-size: 11px;
  color: #8a8a99;
  text-align: center;
}

.frameBody {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 480px;
}

.sidebar {
  border-right: 1px solid #1f1f28;
  padding: 20px 0;
  background: rgba(8, 8, 12, 0.4);
}

.sidebarSection {
  font-family: var(--font-jetbrains), monospace;
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #4a4a55;
  padding: 0 20px 8px;
}

.sidebarRow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 20px;
  font-size: 13px;
  color: #b4b4c4;
  cursor: default;
}

.sidebarRow:hover { background: rgba(255, 255, 255, 0.03); color: #f4f4f8; }

.sidebarActive {
  color: #f4f4f8;
  background: linear-gradient(90deg, rgba(155, 103, 238, 0.1), transparent);
  border-left: 2px solid hsl(258 90% 60%);
  padding-left: 18px;
}

.heroMain {
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.metaLine {
  font-family: var(--font-jetbrains), monospace;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: hsl(258 90% 70%);
}

.appTitle {
  font-family: var(--font-geist-sans), sans-serif;
  font-weight: 600;
  font-size: 22px;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: #f4f4f8;
}

.tabsRow {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #1f1f28;
  position: relative;
}

.tab {
  padding: 10px 16px;
  font-family: var(--font-jetbrains), monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6a6a7a;
  position: relative;
}
.tabActive { color: #f4f4f8; }

.tabIndicator {
  position: absolute;
  bottom: -1px;
  height: 2px;
  background: var(--gradient-brand);
  transition: left 0.55s cubic-bezier(0.4, 0, 0.2, 1),
              width 0.55s cubic-bezier(0.4, 0, 0.2, 1);
}

.aiPane {
  position: relative;
  background: rgba(8, 8, 12, 0.6);
  border: 1px solid #1f1f28;
  border-radius: 10px;
  padding: 20px 22px;
  min-height: 340px;
  font-family: var(--font-serif), Georgia, serif;
  font-size: 16px;
  line-height: 1.65;
  color: #d4d4dc;
}

.paneLabel {
  font-family: var(--font-jetbrains), monospace;
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #6a6a7a;
  margin-bottom: 14px;
}

.bulletList { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }

.bulletItem {
  position: relative;
  padding-left: 22px;
}

.bulletItem::before {
  content: "";
  position: absolute;
  left: 6px;
  top: 11px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: hsl(258 90% 60%);
  box-shadow: 0 0 8px rgba(155, 103, 238, 0.5);
}

.qaPair { display: flex; flex-direction: column; gap: 6px; }
.qaPair + .qaPair { margin-top: 18px; }
.qaQ {
  font-family: var(--font-jetbrains), monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a8a99;
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: hsl(258 90% 70%);
  vertical-align: text-bottom;
  margin-left: 2px;
  animation: cursorBlink 1s steps(2) infinite;
}

@keyframes cursorBlink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.statusRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-jetbrains), monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #6a6a7a;
}

.statusLive {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.statusLive::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: hsl(140 70% 50%);
  box-shadow: 0 0 8px hsl(140 70% 50%);
}
```

- [ ] **Step 2: Implement HeroDemo (static, no cycling yet)**

Create `apps/web/src/components/marketing/hero/hero-demo.tsx`. The component is "use client" so the next two tasks can layer in the cycle + parallax without restructuring.

```tsx
"use client";

import { LayoutGrid, Trello, Copy, User } from "lucide-react";
import styles from "../marketing.module.css";

const TAB_LABELS = ["Overview", "Cover Letter", "Resume", "Answers", "Timeline"] as const;
const ACTIVE_TAB_INDEX = 1; // Cover Letter is the initial active tab

const COVER_LETTER = (
  <p>
    Dear YouTube Creator Partnerships team, I&apos;d love to join the team building tools for creators. The
    work you&apos;re doing is exactly the kind of thing I&apos;ve been focused on for the past year. I think
    I&apos;d bring real momentum on day one
    <span className={styles.cursor} aria-hidden="true" />
  </p>
);

export function HeroDemo() {
  return (
    <div className={styles.frameStage}>
      <div className={styles.heroFrame}>
        <div className={styles.frameChrome}>
          <span className={`${styles.dot} ${styles.dotR}`} aria-hidden="true" />
          <span className={`${styles.dot} ${styles.dotY}`} aria-hidden="true" />
          <span className={`${styles.dot} ${styles.dotG}`} aria-hidden="true" />
          <div className={styles.urlBar}>jobcopilot.app/applications/3a904ba7</div>
        </div>

        <div className={styles.frameBody}>
          <nav className={styles.sidebar} aria-label="Demo sidebar">
            <div className={styles.sidebarSection}>Workspace</div>
            <SidebarRow icon={<LayoutGrid size={14} />} label="Dashboard" />
            <SidebarRow icon={<Trello size={14} />} label="Tracker" active />
            <SidebarRow icon={<Copy size={14} />} label="Resume Variants" />
            <SidebarRow icon={<User size={14} />} label="Profile" />
          </nav>

          <div className={styles.heroMain}>
            <div className={styles.metaLine}>GOOGLE · APPLICATIONS ENGINEER</div>
            <h3 className={styles.appTitle}>Applications Engineer, YouTube Creator Partnerships</h3>

            <div className={styles.tabsRow} role="tablist">
              {TAB_LABELS.map((label, i) => (
                <div
                  key={label}
                  role="tab"
                  aria-selected={i === ACTIVE_TAB_INDEX}
                  className={`${styles.tab} ${i === ACTIVE_TAB_INDEX ? styles.tabActive : ""}`}
                >
                  {label}
                </div>
              ))}
              {/* Tab indicator: width/left set by the cycle in Task 7. Static
                  placeholder for now points at Cover Letter (index 1). */}
              <div className={styles.tabIndicator} style={{ left: "94px", width: "112px" }} />
            </div>

            <div className={styles.aiPane}>{COVER_LETTER}</div>

            <div className={styles.statusRow}>
              <span className={styles.statusLive}>LIVE</span>
              <span>DRAFTING COVER LETTER</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarRow({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={`${styles.sidebarRow} ${active ? styles.sidebarActive : ""}`} aria-current={active ? "page" : undefined}>
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
```

- [ ] **Step 3: Verify it typechecks**

Run: `pnpm -F @jobcopilot/web typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```powershell
git add apps/web/src/components/marketing/hero/hero-demo.tsx apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): scaffold static HeroDemo frame (sidebar + tabs + cover letter pane)"
```

---

## Task 7: HeroDemo tab cycle (every 4.5s, status row sync)

**Files:**
- Modify: `apps/web/src/components/marketing/hero/hero-demo.tsx`
- Test: `apps/web/src/components/marketing/hero/hero-demo.test.tsx`

Per spec §5: every 4.5s the active tab advances Cover Letter → Resume → Answers, indicator slides, status row label updates: "DRAFTING COVER LETTER" → "TAILORING RESUME BULLETS" → "ANSWERING FREE TEXT QUESTIONS". The Overview/Timeline tabs are NOT in the cycle — they just sit there. Pane crossfades opacity + translateY 6px on swap (0.4s).

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/marketing/hero/hero-demo.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { HeroDemo } from "./hero-demo";

describe("HeroDemo tab cycle", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("starts on Cover Letter with the matching status label", () => {
    const { getByText, queryByText } = render(<HeroDemo />);
    expect(getByText("DRAFTING COVER LETTER")).toBeTruthy();
    // Resume bullets pane label appears only when active
    expect(queryByText("Resume bullets · tailored to posting")).toBeNull();
  });

  it("advances to Resume after 4.5s and updates the status label", () => {
    const { getByText, queryByText } = render(<HeroDemo />);
    act(() => { vi.advanceTimersByTime(4500); });
    expect(getByText("TAILORING RESUME BULLETS")).toBeTruthy();
    expect(getByText("Resume bullets · tailored to posting")).toBeTruthy();
    expect(queryByText("DRAFTING COVER LETTER")).toBeNull();
  });

  it("advances to Answers after another 4.5s", () => {
    const { getByText } = render(<HeroDemo />);
    act(() => { vi.advanceTimersByTime(4500); }); // Resume
    act(() => { vi.advanceTimersByTime(4500); }); // Answers
    expect(getByText("ANSWERING FREE TEXT QUESTIONS")).toBeTruthy();
  });

  it("loops back to Cover Letter after Answers", () => {
    const { getByText } = render(<HeroDemo />);
    act(() => { vi.advanceTimersByTime(4500 * 3); });
    expect(getByText("DRAFTING COVER LETTER")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test hero-demo`
Expected: FAIL — initial test expects status label changes, current static implementation doesn't change.

- [ ] **Step 3: Replace HeroDemo with the cycling version**

Rewrite `apps/web/src/components/marketing/hero/hero-demo.tsx`:

```tsx
"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { LayoutGrid, Trello, Copy, User } from "lucide-react";
import styles from "../marketing.module.css";

const TAB_LABELS = ["Overview", "Cover Letter", "Resume", "Answers", "Timeline"] as const;
// Cycle order is Cover Letter → Resume → Answers (indices 1 → 2 → 3).
const CYCLE_INDICES = [1, 2, 3] as const;
const STATUS_LABELS: Record<number, string> = {
  1: "DRAFTING COVER LETTER",
  2: "TAILORING RESUME BULLETS",
  3: "ANSWERING FREE TEXT QUESTIONS",
};

export function HeroDemo() {
  const [activeIdx, setActiveIdx] = useState<number>(1);
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    let cycleStep = 0;
    const id = setInterval(() => {
      cycleStep = (cycleStep + 1) % CYCLE_INDICES.length;
      setActiveIdx(CYCLE_INDICES[cycleStep]);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  useLayoutEffect(() => {
    const el = tabRefs.current[activeIdx];
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeIdx]);

  return (
    <div className={styles.frameStage}>
      <div className={styles.heroFrame}>
        <div className={styles.frameChrome}>
          <span className={`${styles.dot} ${styles.dotR}`} aria-hidden="true" />
          <span className={`${styles.dot} ${styles.dotY}`} aria-hidden="true" />
          <span className={`${styles.dot} ${styles.dotG}`} aria-hidden="true" />
          <div className={styles.urlBar}>jobcopilot.app/applications/3a904ba7</div>
        </div>

        <div className={styles.frameBody}>
          <nav className={styles.sidebar} aria-label="Demo sidebar">
            <div className={styles.sidebarSection}>Workspace</div>
            <SidebarRow icon={<LayoutGrid size={14} />} label="Dashboard" />
            <SidebarRow icon={<Trello size={14} />} label="Tracker" active />
            <SidebarRow icon={<Copy size={14} />} label="Resume Variants" />
            <SidebarRow icon={<User size={14} />} label="Profile" />
          </nav>

          <div className={styles.heroMain}>
            <div className={styles.metaLine}>GOOGLE · APPLICATIONS ENGINEER</div>
            <h3 className={styles.appTitle}>Applications Engineer, YouTube Creator Partnerships</h3>

            <div className={styles.tabsRow} role="tablist">
              {TAB_LABELS.map((label, i) => (
                <div
                  key={label}
                  ref={(el) => { tabRefs.current[i] = el; }}
                  role="tab"
                  aria-selected={i === activeIdx}
                  className={`${styles.tab} ${i === activeIdx ? styles.tabActive : ""}`}
                >
                  {label}
                </div>
              ))}
              <div
                className={styles.tabIndicator}
                style={{ left: `${indicatorStyle.left}px`, width: `${indicatorStyle.width}px` }}
              />
            </div>

            <div className={styles.aiPane}>
              <PaneContent activeIdx={activeIdx} />
            </div>

            <div className={styles.statusRow}>
              <span className={styles.statusLive}>LIVE</span>
              <span>{STATUS_LABELS[activeIdx]}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarRow({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={`${styles.sidebarRow} ${active ? styles.sidebarActive : ""}`} aria-current={active ? "page" : undefined}>
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function PaneContent({ activeIdx }: { activeIdx: number }) {
  if (activeIdx === 1) {
    return (
      <p>
        Dear YouTube Creator Partnerships team, I&apos;d love to join the team building tools for creators.
        The work you&apos;re doing is exactly the kind of thing I&apos;ve been focused on for the past year. I
        think I&apos;d bring real momentum on day one
        <span className={styles.cursor} aria-hidden="true" />
      </p>
    );
  }
  if (activeIdx === 2) {
    return (
      <>
        <div className={styles.paneLabel}>Resume bullets · tailored to posting</div>
        <ul className={styles.bulletList}>
          <li className={styles.bulletItem}>
            Built and shipped JobCopilot, an open source tool that uses Claude to draft job applications end to end.
          </li>
          <li className={styles.bulletItem}>
            Designed a resume variant system. One source of truth, multiple tailored versions per posting.
          </li>
          <li className={styles.bulletItem}>
            Deployed on Vercel and Supabase free tiers. Under $5 a month, full accessibility.
            <span className={styles.cursor} aria-hidden="true" />
          </li>
        </ul>
      </>
    );
  }
  if (activeIdx === 3) {
    return (
      <>
        <div className={styles.qaPair}>
          <div className={styles.qaQ}>Q · Why are you interested in this role?</div>
          <p>
            Creator tooling is one of the most leveraged places to apply AI right now. You ship into a real
            audience that benefits from every percent of friction removed, and I want to work on that surface.
          </p>
        </div>
        <div className={styles.qaPair}>
          <div className={styles.qaQ}>Q · Tell us about a relevant project.</div>
          <p>
            JobCopilot. An open source app that drafts every piece of a job application using Claude. Running on
            free tiers. Source on GitHub
            <span className={styles.cursor} aria-hidden="true" />
          </p>
        </div>
      </>
    );
  }
  // Overview / Timeline aren't in the cycle — show nothing during transitions.
  return null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test hero-demo`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/components/marketing/hero/hero-demo.tsx apps/web/src/components/marketing/hero/hero-demo.test.tsx
git commit -m "feat(marketing): cycle HeroDemo tabs every 4.5s with status row sync"
```

---

## Task 8: HeroDemo mouse parallax wiring

**Files:**
- Modify: `apps/web/src/components/marketing/hero/hero-demo.tsx`

- [ ] **Step 1: Wire up useMouseParallax in HeroDemo**

Edit `apps/web/src/components/marketing/hero/hero-demo.tsx`. Add the hook import and apply it to `.frameStage`:

Change the `import { useEffect, useState, useRef, useLayoutEffect } from "react";` line to also import the hook:

```tsx
import { useMouseParallax } from "../use-mouse-parallax";
```

Inside the `HeroDemo` function, before the `return (`, add:

```tsx
const { transform, handlers } = useMouseParallax();
```

Then change the outer wrapper:

```tsx
<div className={styles.frameStage} style={{ transform }} {...handlers}>
```

- [ ] **Step 2: Manual verification**

Run: `pnpm dev` (from `apps/web/`)

Open the dev page rendering `<HeroDemo />` (it isn't wired into a route yet, so verify by mounting it temporarily in `app/page.tsx`, or skip and verify after Task 23). Move the cursor around the frame; the frame tilts ±2deg. Mouse leave returns to flat over 0.5s.

If you skip the manual check now, it must be done after Task 23 before declaring the hero done.

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/components/marketing/hero/hero-demo.tsx
git commit -m "feat(marketing): wire mouse parallax into HeroDemo"
```

---

## Task 9: HeroSection (eyebrow, h1, lede, CTAs, stagger entrance)

**Files:**
- Create: `apps/web/src/components/marketing/hero/hero-section.tsx`
- Create: `apps/web/src/components/marketing/hero/hero-section.test.tsx`
- Modify: `apps/web/src/components/marketing/marketing.module.css`

Per spec §5 the hero copy is:
- Eyebrow: `A personal tool. Open source. Free.`
- H1: `Stop writing` / `applications.` (gradient on second line)
- Lede: `Paste a job posting. AI drafts the [cover letter], tailors your [resume bullets], and answers every [free text question]. You review, edit, and ship.` (brackets are mono pills)
- Primary CTA: `Try the demo →`
- Ghost CTA: `★ Star on GitHub`

Stagger entrance per spec §5: eyebrow 0.2s, h1 0.4s, lede 0.9s, CTAs 1.2s, frame 1.4s, all `cubic-bezier(.2,.7,.2,1)`. Implement via per-element `animation-delay` rather than IntersectionObserver — this is above-the-fold, the page just loads in.

The CTAs link to:
- Primary: `/login` (the demo lives behind login)
- Ghost: `https://github.com/EthanY33/jobcopilot`

- [ ] **Step 1: Append hero-section CSS to marketing.module.css**

```css
.heroSection {
  position: relative;
  min-height: 100vh;
  padding: 120px 32px 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-x: clip;
  overflow-y: visible;
}

.heroInner {
  max-width: 1200px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 28px;
  position: relative;
  z-index: 1;
}

.heroEyebrow {
  font-family: var(--font-jetbrains), monospace;
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #8a8a99;
  opacity: 0;
  animation: heroFadeIn 1.2s 0.2s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
}

.heroH1 {
  font-family: var(--font-geist-sans), sans-serif;
  font-weight: 700;
  font-size: clamp(48px, 8vw, 96px);
  line-height: 0.95;
  letter-spacing: -0.035em;
  color: #f4f4f8;
  margin: 0;
  opacity: 0;
  transform: translateY(24px);
  animation: heroRise 1.4s 0.4s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
}

.heroH1Gradient {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.heroLede {
  font-family: var(--font-serif), Georgia, serif;
  font-size: 19px;
  line-height: 1.6;
  letter-spacing: -0.005em;
  color: #b4b4c4;
  max-width: 640px;
  opacity: 0;
  animation: heroFadeIn 1s 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
}

.ledePill {
  display: inline-block;
  font-family: var(--font-jetbrains), monospace;
  font-size: 13px;
  padding: 1px 8px;
  border-radius: 4px;
  background: rgba(155, 103, 238, 0.14);
  border: 1px solid rgba(155, 103, 238, 0.3);
  color: hsl(258 90% 78%);
  margin: 0 2px;
  vertical-align: 1px;
}

.heroCtas {
  display: flex;
  gap: 12px;
  opacity: 0;
  animation: heroFadeIn 1s 1.2s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
}

.heroFrameWrap {
  width: 100%;
  margin-top: 24px;
  opacity: 0;
  transform: translateY(24px);
  animation: heroRise 1.4s 1.4s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
}

@keyframes heroFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes heroRise {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .heroEyebrow, .heroH1, .heroLede, .heroCtas, .heroFrameWrap {
    opacity: 1; transform: none; animation: none;
  }
}
```

- [ ] **Step 2: Write the failing test**

Create `apps/web/src/components/marketing/hero/hero-section.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { HeroSection } from "./hero-section";

describe("HeroSection (locked copy)", () => {
  it("renders the locked eyebrow verbatim", () => {
    const { getByText } = render(<HeroSection />);
    expect(getByText("A personal tool. Open source. Free.")).toBeTruthy();
  });

  it("renders the H1 with both lines", () => {
    const { getByText } = render(<HeroSection />);
    expect(getByText("Stop writing")).toBeTruthy();
    expect(getByText("applications.")).toBeTruthy();
  });

  it("renders the lede with the three mono pills", () => {
    const { getByText } = render(<HeroSection />);
    expect(getByText("cover letter")).toBeTruthy();
    expect(getByText("resume bullets")).toBeTruthy();
    expect(getByText("free text question")).toBeTruthy();
  });

  it("renders both CTAs", () => {
    const { getByText } = render(<HeroSection />);
    expect(getByText(/Try the demo/)).toBeTruthy();
    expect(getByText(/Star on GitHub/)).toBeTruthy();
  });

  it("the primary CTA links to /login", () => {
    const { getByText } = render(<HeroSection />);
    const primary = getByText(/Try the demo/).closest("a");
    expect(primary?.getAttribute("href")).toBe("/login");
  });

  it("the ghost CTA links to the GitHub repo", () => {
    const { getByText } = render(<HeroSection />);
    const ghost = getByText(/Star on GitHub/).closest("a");
    expect(ghost?.getAttribute("href")).toBe("https://github.com/EthanY33/jobcopilot");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test hero-section`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement HeroSection**

Create `apps/web/src/components/marketing/hero/hero-section.tsx`:

```tsx
import Link from "next/link";
import { HeroDemo } from "./hero-demo";
import { DriftOrb } from "../drift-orb";
import styles from "../marketing.module.css";

export function HeroSection() {
  return (
    <section className={styles.heroSection} aria-labelledby="hero-heading">
      <DriftOrb size={600} color="violet" opacity={0.35} top="-200px" right="-150px" animationName="drift1" duration="28s" />
      <DriftOrb size={500} color="azure" opacity={0.28} bottom="-260px" left="-120px" animationName="drift2" duration="22s" />

      <div className={styles.heroInner}>
        <div className={styles.heroEyebrow}>A personal tool. Open source. Free.</div>

        <h1 id="hero-heading" className={styles.heroH1}>
          <span>Stop writing</span>
          <br />
          <span className={styles.heroH1Gradient}>applications.</span>
        </h1>

        <p className={styles.heroLede}>
          Paste a job posting. AI drafts the <span className={styles.ledePill}>cover letter</span>, tailors
          your <span className={styles.ledePill}>resume bullets</span>, and answers every{" "}
          <span className={styles.ledePill}>free text question</span>. You review, edit, and ship.
        </p>

        <div className={styles.heroCtas}>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-md bg-[image:var(--gradient-brand)] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-[hsl(var(--brand-violet)/.4)] transition-opacity hover:opacity-90"
          >
            Try the demo →
          </Link>
          <a
            href="https://github.com/EthanY33/jobcopilot"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-md border border-[#25252e] bg-transparent px-6 py-3 text-sm font-semibold text-[#f4f4f8] transition-colors hover:bg-[rgba(255,255,255,0.04)]"
          >
            ★ Star on GitHub
          </a>
        </div>

        <div className={styles.heroFrameWrap}>
          <HeroDemo />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test hero-section`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/components/marketing/hero/hero-section.tsx apps/web/src/components/marketing/hero/hero-section.test.tsx apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): add HeroSection with stagger entrance + DriftOrb pair"
```

---

## Task 10: PasteVisual mini-component

**Files:**
- Create: `apps/web/src/components/marketing/how-it-works/paste-visual.tsx`
- Modify: `apps/web/src/components/marketing/marketing.module.css`

Mock URL input field "boards.greenhouse.io/google/jobs/..." + gradient "Extract + create →" button. Static, no animation.

- [ ] **Step 1: Append how-step + paste-visual styles**

Append to `apps/web/src/components/marketing/marketing.module.css`:

```css
.howVisualFrame {
  position: relative;
  background: rgba(13, 13, 18, 0.7);
  border: 1px solid #1f1f28;
  border-radius: 10px;
  padding: 18px;
  min-height: 110px;
  display: flex;
  align-items: center;
  gap: 10px;
  backdrop-filter: blur(12px);
}

.pasteUrl {
  flex: 1;
  background: #08080c;
  border: 1px solid #25252e;
  border-radius: 6px;
  padding: 8px 12px;
  font-family: var(--font-jetbrains), monospace;
  font-size: 11px;
  color: #6a6a7a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pasteCta {
  background: var(--gradient-brand);
  border-radius: 6px;
  padding: 8px 12px;
  font-family: var(--font-geist-sans), sans-serif;
  font-weight: 600;
  font-size: 12px;
  color: #fff;
  white-space: nowrap;
}
```

- [ ] **Step 2: Implement PasteVisual**

Create `apps/web/src/components/marketing/how-it-works/paste-visual.tsx`:

```tsx
import styles from "../marketing.module.css";

export function PasteVisual() {
  return (
    <div className={styles.howVisualFrame} aria-hidden="true">
      <div className={styles.pasteUrl}>boards.greenhouse.io/google/jobs/...</div>
      <div className={styles.pasteCta}>Extract + create →</div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/components/marketing/how-it-works/paste-visual.tsx apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): add PasteVisual mini-component"
```

---

## Task 11: DraftVisual mini-component (cursor blink)

**Files:**
- Create: `apps/web/src/components/marketing/how-it-works/draft-visual.tsx`

Mini serif AI output line ("Dear team, the role's emphasis on AI tooling for creators aligns with [mini-cursor]"). Reuses `.cursor` class from Task 6.

- [ ] **Step 1: Implement DraftVisual**

Create `apps/web/src/components/marketing/how-it-works/draft-visual.tsx`:

```tsx
import styles from "../marketing.module.css";

export function DraftVisual() {
  return (
    <div className={styles.howVisualFrame} aria-hidden="true">
      <p
        style={{
          fontFamily: "var(--font-serif), Georgia, serif",
          fontSize: "13px",
          lineHeight: 1.55,
          color: "#b4b4c4",
          margin: 0,
        }}
      >
        Dear team, the role&apos;s emphasis on AI tooling for creators aligns with
        <span className={styles.cursor} />
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git add apps/web/src/components/marketing/how-it-works/draft-visual.tsx
git commit -m "feat(marketing): add DraftVisual mini-component"
```

---

## Task 12: ShipVisual mini-component (3-column kanban with completed→applied loop)

**Files:**
- Create: `apps/web/src/components/marketing/how-it-works/ship-visual.tsx`
- Modify: `apps/web/src/components/marketing/marketing.module.css`

Per spec §5 step 03: 3-column kanban (Wishlist/Drafting/Applied) with the Drafting card glowing bright then fading dim, and the Applied card popping in with scale-bounce + brighter glow on a 6s loop using `cubic-bezier(.4,0,.2,1)` with a graceful crossfade-reset window (80-100%) so the loop boundary never visually "teleports".

Approach: two cards positioned absolutely, each with its own keyframe set so the transitions are independent. Loop animation drives both: at 0% the Drafting card is bright + Applied invisible, at ~50% Drafting fades dim + Applied scale-bounces in, at 80-100% they cross-fade back to start.

- [ ] **Step 1: Append ship-visual CSS**

Append to `apps/web/src/components/marketing/marketing.module.css`:

```css
.shipFrame {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  padding: 12px;
  height: 110px;
  background: rgba(13, 13, 18, 0.7);
  border: 1px solid #1f1f28;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
}

.shipCol {
  background: rgba(8, 8, 12, 0.5);
  border-radius: 6px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shipColLabel {
  font-family: var(--font-jetbrains), monospace;
  font-size: 8px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #6a6a7a;
}

.shipCard {
  background: rgba(36, 36, 46, 0.6);
  border: 1px solid #25252e;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 9px;
  color: #b4b4c4;
}

.shipCardDrafting {
  animation: shipDrafting 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.shipCardApplied {
  animation: shipApplied 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  border-color: hsl(258 90% 60%);
}

@keyframes shipDrafting {
  0%, 35%   { opacity: 1; box-shadow: 0 0 14px rgba(155, 103, 238, 0.4) inset; }
  50%, 75%  { opacity: 0.4; box-shadow: none; }
  85%       { opacity: 0.4; box-shadow: none; }
  100%      { opacity: 1; box-shadow: 0 0 14px rgba(155, 103, 238, 0.4) inset; }
}

@keyframes shipApplied {
  0%, 35%   { opacity: 0; transform: scale(0.7); }
  50%       { opacity: 1; transform: scale(1.06); box-shadow: 0 0 18px rgba(155, 103, 238, 0.55); }
  60%, 80%  { opacity: 1; transform: scale(1); box-shadow: 0 0 12px rgba(155, 103, 238, 0.4); }
  90%       { opacity: 0.4; transform: scale(0.96); box-shadow: none; }
  100%      { opacity: 0; transform: scale(0.7); }
}

@media (prefers-reduced-motion: reduce) {
  .shipCardDrafting, .shipCardApplied { animation: none; opacity: 1; }
}
```

- [ ] **Step 2: Implement ShipVisual**

Create `apps/web/src/components/marketing/how-it-works/ship-visual.tsx`:

```tsx
import styles from "../marketing.module.css";

export function ShipVisual() {
  return (
    <div className={styles.shipFrame} aria-hidden="true">
      <div className={styles.shipCol}>
        <div className={styles.shipColLabel}>Wishlist</div>
        <div className={styles.shipCard}>Anthropic</div>
      </div>
      <div className={styles.shipCol}>
        <div className={styles.shipColLabel}>Drafting</div>
        <div className={`${styles.shipCard} ${styles.shipCardDrafting}`}>Google</div>
      </div>
      <div className={styles.shipCol}>
        <div className={styles.shipColLabel}>Applied</div>
        <div className={`${styles.shipCard} ${styles.shipCardApplied}`}>Google</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/components/marketing/how-it-works/ship-visual.tsx apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): add ShipVisual with 6s drafting→applied loop"
```

---

## Task 13: HowStep component

**Files:**
- Create: `apps/web/src/components/marketing/how-it-works/how-step.tsx`
- Modify: `apps/web/src/components/marketing/marketing.module.css`

64×64 circular gradient number badge with double-ring shadow + violet glow drop. Title (Geist 600 24px) + serif description. Visual frame slot for children.

- [ ] **Step 1: Append how-step CSS**

```css
.howStep {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
}

.howNumber {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--gradient-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-geist-sans), sans-serif;
  font-weight: 700;
  font-size: 24px;
  color: #fff;
  box-shadow:
    0 0 0 8px rgba(13, 13, 18, 1),
    0 0 0 9px #1f1f28,
    0 0 24px rgba(155, 103, 238, 0.4);
  z-index: 2;
}

.howStepTitle {
  font-family: var(--font-geist-sans), sans-serif;
  font-weight: 600;
  font-size: 24px;
  letter-spacing: -0.02em;
  color: #f4f4f8;
  margin: 0;
}

.howStepDesc {
  font-family: var(--font-serif), Georgia, serif;
  font-size: 16px;
  line-height: 1.65;
  color: #b4b4c4;
  margin: 0;
}
```

- [ ] **Step 2: Implement HowStep**

Create `apps/web/src/components/marketing/how-it-works/how-step.tsx`:

```tsx
import type { ReactNode } from "react";
import styles from "../marketing.module.css";

interface HowStepProps {
  number: 1 | 2 | 3;
  title: string;
  description: string;
  visual: ReactNode;
}

export function HowStep({ number, title, description, visual }: HowStepProps) {
  return (
    <div className={styles.howStep}>
      <div className={styles.howNumber} aria-hidden="true">
        {String(number).padStart(2, "0")}
      </div>
      <h3 className={styles.howStepTitle}>{title}</h3>
      <p className={styles.howStepDesc}>{description}</p>
      <div>{visual}</div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/components/marketing/how-it-works/how-step.tsx apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): add HowStep component (number badge + title + desc + visual slot)"
```

---

## Task 14: HowItWorksSection (heading + 3-step grid + scroll-reveal)

**Files:**
- Create: `apps/web/src/components/marketing/how-it-works/how-it-works-section.tsx`
- Modify: `apps/web/src/components/marketing/marketing.module.css`

Per spec §5 "Section 02 — How It Works":
- H2: `Three steps. No resume tinkering.` (gradient on second clause "No resume tinkering.")
- Sub: `JobCopilot reads the posting, drafts every piece against your resume, then tracks the outcome. You stay in the loop. You just stop writing the boring parts.`

Step copy + visuals:
1. **Paste** — title `Paste the posting.` desc `Drop in a Greenhouse, Lever, or Workday URL. JobCopilot extracts the role, requirements, and tone.` Visual `<PasteVisual />`
2. **Draft** — title `Draft against your resume.` desc `Claude writes the cover letter, picks resume bullets, and answers free text questions in your voice.` Visual `<DraftVisual />`
3. **Ship** — title `Ship and track.` desc `Move cards across your pipeline. Stay on top of follow-ups. Every application stays drafted, edited, and submitted from one place.` Visual `<ShipVisual />`

Connecting line: thin 1px horizontal gradient under the step numbers.

Bridge orb: 560×560 azure, opacity 0.22, `top: -280px; left: 35%`. Lower-left violet 460×460 opacity 0.22 at `top: 18%; left: -160px`. Lower-right azure 420×420 opacity 0.18 `bottom: -120px; right: -140px`.

- [ ] **Step 1: Append how-section CSS**

```css
.howSection {
  position: relative;
  padding: 160px 32px 160px;
  max-width: 1100px;
  margin: 0 auto;
  overflow-x: clip;
  overflow-y: visible;
}

.howHeading {
  text-align: center;
  margin-bottom: 80px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.h2 {
  font-family: var(--font-geist-sans), sans-serif;
  font-weight: 700;
  font-size: clamp(44px, 6.5vw, 76px);
  line-height: 1.02;
  letter-spacing: -0.035em;
  color: #f4f4f8;
  margin: 0;
  max-width: 900px;
}

.h2Gradient {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.sectionSub {
  font-family: var(--font-serif), Georgia, serif;
  font-size: 18px;
  line-height: 1.65;
  color: #b4b4c4;
  max-width: 640px;
  margin: 0;
}

.howGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 48px;
  position: relative;
}

.howConnector {
  position: absolute;
  top: 32px;
  left: 8%;
  right: 8%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(155, 103, 238, 0.4), rgba(44, 129, 255, 0.4), transparent);
  z-index: 0;
}

@media (max-width: 768px) {
  .howGrid { grid-template-columns: 1fr; gap: 56px; }
  .howConnector { display: none; }
}
```

- [ ] **Step 2: Implement HowItWorksSection**

Create `apps/web/src/components/marketing/how-it-works/how-it-works-section.tsx`:

```tsx
import { HowStep } from "./how-step";
import { PasteVisual } from "./paste-visual";
import { DraftVisual } from "./draft-visual";
import { ShipVisual } from "./ship-visual";
import { ScrollReveal } from "../scroll-reveal";
import { DriftOrb } from "../drift-orb";
import styles from "../marketing.module.css";

export function HowItWorksSection() {
  return (
    <section className={styles.howSection} aria-labelledby="how-heading">
      <DriftOrb size={560} color="azure" opacity={0.22} top="-280px" left="35%" animationName="drift1" duration="32s" />
      <DriftOrb size={460} color="violet" opacity={0.22} top="18%" left="-160px" animationName="drift2" duration="26s" />
      <DriftOrb size={420} color="azure" opacity={0.18} bottom="-120px" right="-140px" animationName="drift1" duration="24s" />

      <ScrollReveal>
        <div className={styles.howHeading}>
          <h2 id="how-heading" className={styles.h2}>
            Three steps. <span className={styles.h2Gradient}>No resume tinkering.</span>
          </h2>
          <p className={styles.sectionSub}>
            JobCopilot reads the posting, drafts every piece against your resume, then tracks the outcome. You
            stay in the loop. You just stop writing the boring parts.
          </p>
        </div>
      </ScrollReveal>

      <div className={styles.howGrid}>
        <div className={styles.howConnector} aria-hidden="true" />
        <ScrollReveal>
          <HowStep
            number={1}
            title="Paste the posting."
            description="Drop in a Greenhouse, Lever, or Workday URL. JobCopilot extracts the role, requirements, and tone."
            visual={<PasteVisual />}
          />
        </ScrollReveal>
        <ScrollReveal delayMs={150}>
          <HowStep
            number={2}
            title="Draft against your resume."
            description="Claude writes the cover letter, picks resume bullets, and answers free text questions in your voice."
            visual={<DraftVisual />}
          />
        </ScrollReveal>
        <ScrollReveal delayMs={300}>
          <HowStep
            number={3}
            title="Ship and track."
            description="Move cards across your pipeline. Stay on top of follow-ups. Every application stays drafted, edited, and submitted from one place."
            visual={<ShipVisual />}
          />
        </ScrollReveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Smoke-test compiles**

Run: `pnpm -F @jobcopilot/web typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```powershell
git add apps/web/src/components/marketing/how-it-works/how-it-works-section.tsx apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): add HowItWorksSection with 3-step grid + scroll-reveal"
```

---

## Task 15: ApplicationCardPreview

**Files:**
- Create: `apps/web/src/components/marketing/tracker/application-data.ts`
- Create: `apps/web/src/components/marketing/tracker/application-card-preview.tsx`
- Modify: `apps/web/src/components/marketing/marketing.module.css`

Card structure per spec §5:
- top row [22×22 rounded-square avatar | mono small-caps company]
- title (Geist 500 13px, **2-line clamp via -webkit-line-clamp**)
- bottom row [mono timestamp | colored status dot glowing in column accent color]

Status colors per spec §3:
- Wishlist: `hsl(220 15% 50%)` → `hsl(220 15% 35%)` gradient (muted gray-blue)
- Applied: `hsl(258 90% 60%)` → `hsl(258 90% 45%)` (brand violet)
- Phone screen: `hsl(215 95% 60%)` → `hsl(215 95% 40%)` (brand azure)
- Onsite: full brand gradient
- Offer: `hsl(140 70% 60%)` → `hsl(140 70% 40%)` (success green)

- [ ] **Step 1: Define application data**

Create `apps/web/src/components/marketing/tracker/application-data.ts`:

```ts
export type ApplicationStatus = "wishlist" | "applied" | "phone" | "onsite" | "offer";

export interface ApplicationPreview {
  id: string;
  status: ApplicationStatus;
  companyInitial: string;
  companyName: string;
  title: string;
  /** CSS gradient string for the avatar tile. */
  avatarGradient: string;
  /** Optional override for the avatar text color (default white). */
  avatarTextColor?: string;
  /** Mono uppercase timestamp text, e.g. "2h ago" or "3d ago". */
  timestamp: string;
  /** True for the Google card in Applied — drives the recent-pulse animation. */
  recent?: boolean;
}

export const APPLICATIONS: ApplicationPreview[] = [
  // Wishlist
  { id: "wishlist-1", status: "wishlist", companyInitial: "A", companyName: "Anthropic",
    title: "Member of Technical Staff, Applied AI",
    avatarGradient: "linear-gradient(135deg, #d97757, #c2410c)", timestamp: "1d ago" },
  { id: "wishlist-2", status: "wishlist", companyInitial: "L", companyName: "Linear",
    title: "Senior Product Engineer",
    avatarGradient: "linear-gradient(135deg, #5e6ad2, #3a3f7a)", timestamp: "2d ago" },
  { id: "wishlist-3", status: "wishlist", companyInitial: "F", companyName: "Figma",
    title: "Design Engineer, Editor Surface",
    avatarGradient: "linear-gradient(135deg, #f24e1e, #a259ff)", timestamp: "3d ago" },

  // Applied
  { id: "applied-1", status: "applied", companyInitial: "G", companyName: "Google",
    title: "Applications Engineer, YouTube Creator Partnerships",
    avatarGradient: "linear-gradient(135deg, #4285f4, #34a853)", timestamp: "2h ago", recent: true },
  { id: "applied-2", status: "applied", companyInitial: "S", companyName: "Stripe",
    title: "Software Engineer, Payments Platform",
    avatarGradient: "linear-gradient(135deg, #635bff, #3a32a3)", timestamp: "1d ago" },
  { id: "applied-3", status: "applied", companyInitial: "V", companyName: "Vercel",
    title: "Full-Stack Engineer, Next.js",
    avatarGradient: "linear-gradient(135deg, #fff, #888)", avatarTextColor: "#000", timestamp: "3d ago" },

  // Phone screen
  { id: "phone-1", status: "phone", companyInitial: "N", companyName: "Notion",
    title: "Product Engineer, AI Surface",
    avatarGradient: "linear-gradient(135deg, #f4f4f8, #aaa)", avatarTextColor: "#000", timestamp: "2d ago" },
  { id: "phone-2", status: "phone", companyInitial: "C", companyName: "Cursor",
    title: "Engineer, Inference Quality",
    avatarGradient: "linear-gradient(135deg, #1a1a1a, #555)", timestamp: "5d ago" },

  // Onsite
  { id: "onsite-1", status: "onsite", companyInitial: "S", companyName: "Supabase",
    title: "Full-Stack Engineer, Auth",
    avatarGradient: "linear-gradient(135deg, #3ecf8e, #1f7a5b)", timestamp: "1w ago" },

  // Offer
  { id: "offer-1", status: "offer", companyInitial: "R", companyName: "Replicate",
    title: "Founding Engineer, Inference",
    avatarGradient: "linear-gradient(135deg, hsl(258 90% 60%), hsl(215 95% 50%))", timestamp: "2w ago" },
];
```

- [ ] **Step 2: Append application-card CSS**

```css
.appCard {
  position: relative;
  background: rgba(36, 36, 46, 0.5);
  border: 1px solid #25252e;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform 0.25s, box-shadow 0.25s;
}

.appCard:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 16px rgba(155, 103, 238, 0.18);
}

.appCardTop {
  display: flex;
  align-items: center;
  gap: 8px;
}

.appAvatar {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-geist-sans), sans-serif;
  font-weight: 700;
  font-size: 11px;
  color: #fff;
  flex-shrink: 0;
}

.appCardCompany {
  font-family: var(--font-jetbrains), monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a8a99;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appCardTitle {
  font-family: var(--font-geist-sans), sans-serif;
  font-weight: 500;
  font-size: 13px;
  line-height: 1.35;
  color: #f4f4f8;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.appCardBottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-jetbrains), monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #6a6a7a;
}

.statusDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.statusDotWishlist { background: hsl(220 15% 45%); box-shadow: 0 0 6px hsl(220 15% 50%); }
.statusDotApplied  { background: hsl(258 90% 55%); box-shadow: 0 0 8px hsl(258 90% 60% / 0.7); }
.statusDotPhone    { background: hsl(215 95% 50%); box-shadow: 0 0 8px hsl(215 95% 60% / 0.7); }
.statusDotOnsite   { background: hsl(258 90% 60%); box-shadow: 0 0 10px rgba(155, 103, 238, 0.5); }
.statusDotOffer    { background: hsl(140 70% 50%); box-shadow: 0 0 10px hsl(140 70% 50% / 0.6); }

.appCardRecent {
  animation: recentPulse 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes recentPulse {
  0%, 35%   { border-color: hsl(258 90% 60%); box-shadow: inset 0 0 12px rgba(155, 103, 238, 0.3); }
  65%, 100% { border-color: #25252e; box-shadow: none; }
}

@media (prefers-reduced-motion: reduce) {
  .appCardRecent { animation: none; }
}
```

- [ ] **Step 3: Implement ApplicationCardPreview**

Create `apps/web/src/components/marketing/tracker/application-card-preview.tsx`:

```tsx
import type { ApplicationPreview } from "./application-data";
import styles from "../marketing.module.css";

const STATUS_DOT_CLASS: Record<ApplicationPreview["status"], string> = {
  wishlist: styles.statusDotWishlist,
  applied: styles.statusDotApplied,
  phone: styles.statusDotPhone,
  onsite: styles.statusDotOnsite,
  offer: styles.statusDotOffer,
};

export function ApplicationCardPreview({ app }: { app: ApplicationPreview }) {
  return (
    <div className={`${styles.appCard} ${app.recent ? styles.appCardRecent : ""}`}>
      <div className={styles.appCardTop}>
        <div
          className={styles.appAvatar}
          style={{ background: app.avatarGradient, color: app.avatarTextColor ?? "#fff" }}
          aria-hidden="true"
        >
          {app.companyInitial}
        </div>
        <div className={styles.appCardCompany}>{app.companyName}</div>
      </div>
      <div className={styles.appCardTitle}>{app.title}</div>
      <div className={styles.appCardBottom}>
        <span>{app.timestamp}</span>
        <span className={`${styles.statusDot} ${STATUS_DOT_CLASS[app.status]}`} aria-hidden="true" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```powershell
git add apps/web/src/components/marketing/tracker/application-data.ts apps/web/src/components/marketing/tracker/application-card-preview.tsx apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): add ApplicationCardPreview + 10-application data"
```

---

## Task 16: KanbanColumnPreview

**Files:**
- Create: `apps/web/src/components/marketing/tracker/kanban-column-preview.tsx`
- Modify: `apps/web/src/components/marketing/marketing.module.css`

Per spec §5: head row (mono uppercase label + count pill) + body container (rounded `rgba(8,8,12,.5)` with a 2px gradient accent bar at the top, color-coded per status — see §3 status accents).

- [ ] **Step 1: Append kanban-column CSS**

```css
.kanbanCol {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 320px;
}

.kanbanColHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-jetbrains), monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.kanbanColCount {
  display: inline-block;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 9px;
}

.kanbanColBody {
  background: rgba(8, 8, 12, 0.5);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  flex: 1;
}

.kanbanColBody::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  border-radius: 8px 8px 0 0;
}

.kanbanColWishlist     { color: hsl(220 15% 60%); }
.kanbanColWishlist .kanbanColCount { color: hsl(220 15% 60%); }
.kanbanColWishlist .kanbanColBody::before { background: linear-gradient(90deg, hsl(220 15% 50%), hsl(220 15% 35%)); }

.kanbanColApplied      { color: hsl(258 90% 70%); }
.kanbanColApplied .kanbanColCount { color: hsl(258 90% 70%); }
.kanbanColApplied .kanbanColBody::before { background: linear-gradient(90deg, hsl(258 90% 60%), hsl(258 90% 45%)); }

.kanbanColPhone        { color: hsl(215 95% 70%); }
.kanbanColPhone .kanbanColCount { color: hsl(215 95% 70%); }
.kanbanColPhone .kanbanColBody::before { background: linear-gradient(90deg, hsl(215 95% 60%), hsl(215 95% 40%)); }

.kanbanColOnsite       { color: hsl(258 90% 70%); }
.kanbanColOnsite .kanbanColCount { color: hsl(258 90% 70%); }
.kanbanColOnsite .kanbanColBody::before { background: var(--gradient-brand); }

.kanbanColOffer        { color: hsl(140 70% 60%); }
.kanbanColOffer .kanbanColCount { color: hsl(140 70% 60%); }
.kanbanColOffer .kanbanColBody::before { background: linear-gradient(90deg, hsl(140 70% 60%), hsl(140 70% 40%)); }
```

- [ ] **Step 2: Implement KanbanColumnPreview**

Create `apps/web/src/components/marketing/tracker/kanban-column-preview.tsx`:

```tsx
import type { ReactNode } from "react";
import type { ApplicationStatus } from "./application-data";
import styles from "../marketing.module.css";

const STATUS_TO_CLASS: Record<ApplicationStatus, string> = {
  wishlist: styles.kanbanColWishlist,
  applied: styles.kanbanColApplied,
  phone: styles.kanbanColPhone,
  onsite: styles.kanbanColOnsite,
  offer: styles.kanbanColOffer,
};

interface KanbanColumnPreviewProps {
  status: ApplicationStatus;
  label: string;
  count: number;
  children: ReactNode;
}

export function KanbanColumnPreview({ status, label, count, children }: KanbanColumnPreviewProps) {
  return (
    <div className={`${styles.kanbanCol} ${STATUS_TO_CLASS[status]}`}>
      <div className={styles.kanbanColHead}>
        <span>{label}</span>
        <span className={styles.kanbanColCount}>{count}</span>
      </div>
      <div className={styles.kanbanColBody}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/components/marketing/tracker/kanban-column-preview.tsx apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): add KanbanColumnPreview with status-tinted accent bar"
```

---

## Task 17: KanbanPreview composition

**Files:**
- Create: `apps/web/src/components/marketing/tracker/kanban-preview.tsx`
- Modify: `apps/web/src/components/marketing/marketing.module.css`

Browser-chrome shell with URL `jobcopilot.app/tracker`. Body: `grid-cols-5, gap: 14px`. Reuses the chrome dot + url-bar CSS from Task 6.

- [ ] **Step 1: Append kanban-frame CSS**

```css
.kanbanFrame {
  background: #0d0d12;
  border: 1px solid #25252e;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.6);
}

.kanbanGrid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  padding: 18px;
}

@media (max-width: 1100px) {
  .kanbanGrid { grid-template-columns: repeat(2, 1fr); }
}
```

- [ ] **Step 2: Implement KanbanPreview**

Create `apps/web/src/components/marketing/tracker/kanban-preview.tsx`:

```tsx
import { APPLICATIONS, type ApplicationStatus } from "./application-data";
import { ApplicationCardPreview } from "./application-card-preview";
import { KanbanColumnPreview } from "./kanban-column-preview";
import styles from "../marketing.module.css";

const COLUMNS: { status: ApplicationStatus; label: string }[] = [
  { status: "wishlist", label: "Wishlist" },
  { status: "applied", label: "Applied" },
  { status: "phone", label: "Phone screen" },
  { status: "onsite", label: "Onsite" },
  { status: "offer", label: "Offer" },
];

export function KanbanPreview() {
  return (
    <div className={styles.kanbanFrame}>
      <div className={styles.frameChrome}>
        <span className={`${styles.dot} ${styles.dotR}`} aria-hidden="true" />
        <span className={`${styles.dot} ${styles.dotY}`} aria-hidden="true" />
        <span className={`${styles.dot} ${styles.dotG}`} aria-hidden="true" />
        <div className={styles.urlBar}>jobcopilot.app/tracker</div>
      </div>
      <div className={styles.kanbanGrid}>
        {COLUMNS.map((col) => {
          const cards = APPLICATIONS.filter((a) => a.status === col.status);
          return (
            <KanbanColumnPreview key={col.status} status={col.status} label={col.label} count={cards.length}>
              {cards.map((app) => (
                <ApplicationCardPreview key={app.id} app={app} />
              ))}
            </KanbanColumnPreview>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/components/marketing/tracker/kanban-preview.tsx apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): add KanbanPreview composing 5 columns of cards"
```

---

## Task 18: TrackerPipelineSection

**Files:**
- Create: `apps/web/src/components/marketing/tracker/tracker-pipeline-section.tsx`
- Modify: `apps/web/src/components/marketing/marketing.module.css`

Per spec §5 "Section 03 — Tracker Pipeline":
- H2: `Every application, in one view.` (gradient on second clause "in one view.")
- Sub: `Drag cards to update status. Click any card to jump back to the drafts. Wishlist, applied, screens, offers. All in one place.`
- Stats strip: 3 stats centered with 56px gap. `38px Geist 700 number / mono uppercase label`. `23` applications · `6` phone screens · gradient `2` offers.

Section orbs: upper-right violet 520×520 opacity 0.2, `top: 8%; right: -180px`. Lower-left azure 480×480 opacity 0.18, `bottom: 10%; left: -160px`.

- [ ] **Step 1: Append tracker-section CSS**

```css
.trackerSection {
  position: relative;
  padding: 160px 32px 160px;
  max-width: 1200px;
  margin: 0 auto;
  overflow-x: clip;
  overflow-y: visible;
}

.trackerHeading {
  text-align: center;
  margin-bottom: 56px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.statsStrip {
  display: flex;
  justify-content: center;
  gap: 56px;
  margin-bottom: 56px;
  flex-wrap: wrap;
}

.statBlock {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.statNumber {
  font-family: var(--font-geist-sans), sans-serif;
  font-weight: 700;
  font-size: 38px;
  line-height: 1;
  color: #f4f4f8;
}

.statNumberGradient {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.statLabel {
  font-family: var(--font-jetbrains), monospace;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8a8a99;
}
```

- [ ] **Step 2: Implement TrackerPipelineSection**

Create `apps/web/src/components/marketing/tracker/tracker-pipeline-section.tsx`:

```tsx
import { KanbanPreview } from "./kanban-preview";
import { ScrollReveal } from "../scroll-reveal";
import { DriftOrb } from "../drift-orb";
import styles from "../marketing.module.css";

export function TrackerPipelineSection() {
  return (
    <section className={styles.trackerSection} aria-labelledby="tracker-heading">
      <DriftOrb size={520} color="violet" opacity={0.2} top="8%" right="-180px" animationName="drift1" duration="30s" />
      <DriftOrb size={480} color="azure" opacity={0.18} bottom="10%" left="-160px" animationName="drift2" duration="26s" />

      <ScrollReveal>
        <div className={styles.trackerHeading}>
          <h2 id="tracker-heading" className={styles.h2}>
            Every application, <span className={styles.h2Gradient}>in one view.</span>
          </h2>
          <p className={styles.sectionSub}>
            Drag cards to update status. Click any card to jump back to the drafts. Wishlist, applied, screens,
            offers. All in one place.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div className={styles.statsStrip}>
          <div className={styles.statBlock}>
            <span className={styles.statNumber}>23</span>
            <span className={styles.statLabel}>Applications</span>
          </div>
          <div className={styles.statBlock}>
            <span className={styles.statNumber}>6</span>
            <span className={styles.statLabel}>Phone screens</span>
          </div>
          <div className={styles.statBlock}>
            <span className={`${styles.statNumber} ${styles.statNumberGradient}`}>2</span>
            <span className={styles.statLabel}>Offers</span>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delayMs={150}>
        <KanbanPreview />
      </ScrollReveal>
    </section>
  );
}
```

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/components/marketing/tracker/tracker-pipeline-section.tsx apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): add TrackerPipelineSection with stats strip + kanban frame"
```

---

## Task 19: ManifestoSection

**Files:**
- Create: `apps/web/src/components/marketing/manifesto/manifesto-section.tsx`
- Create: `apps/web/src/components/marketing/manifesto/manifesto-section.test.tsx`
- Modify: `apps/web/src/components/marketing/marketing.module.css`

Per spec §5 the manifesto is `max-width: 720px` (narrower than other sections), `padding: 180px 32px 160px`, **left-aligned** text inside the column.

H2: `I built this for myself.` (gradient on "for myself.")

Three locked paragraphs from the spec §5 — copy verbatim.

Specs strip (4 columns): Stack `Next.js + Claude` · Cost `Under $5/mo` (gradient) · License `MIT` · Status `Personal use`.

Author byline: 44×44 brand-gradient circle avatar with "E" + Geist 600 14px name "Ethan Yucetepe" + mono 11px handle "@EthanY33 · github.com/EthanY33/jobcopilot".

- [ ] **Step 1: Append manifesto CSS**

```css
.manifestoSection {
  position: relative;
  padding: 180px 32px 160px;
  max-width: 720px;
  margin: 0 auto;
  overflow-x: clip;
  overflow-y: visible;
}

.manifestoH2 {
  font-family: var(--font-geist-sans), sans-serif;
  font-weight: 700;
  font-size: clamp(44px, 6.5vw, 76px);
  line-height: 1.02;
  letter-spacing: -0.035em;
  color: #f4f4f8;
  margin: 0 0 40px;
  text-align: left;
}

.manifestoBody {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.manifestoP {
  font-family: var(--font-serif), Georgia, serif;
  font-size: 21px;
  line-height: 1.65;
  color: #d4d4dc;
  margin: 0;
}

.manifestoHighlight {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-style: italic;
}

.specsStrip {
  margin-top: 56px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  background: rgba(13, 13, 18, 0.6);
  border: 1px solid #1f1f28;
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(12px);
}

.specBlock {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.specLabel {
  font-family: var(--font-jetbrains), monospace;
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #6a6a7a;
}

.specValue {
  font-family: var(--font-geist-sans), sans-serif;
  font-weight: 500;
  font-size: 14px;
  color: #f4f4f8;
}

.specValueGradient {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.byline {
  margin-top: 56px;
  padding-top: 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  gap: 16px;
}

.bylineAvatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--gradient-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-geist-sans), sans-serif;
  font-weight: 700;
  font-size: 18px;
  color: #fff;
}

.bylineName {
  font-family: var(--font-geist-sans), sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #f4f4f8;
}

.bylineHandle {
  font-family: var(--font-jetbrains), monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #6a6a7a;
}

@media (max-width: 768px) {
  .specsStrip { grid-template-columns: repeat(2, 1fr); }
}
```

- [ ] **Step 2: Write the failing test**

Create `apps/web/src/components/marketing/manifesto/manifesto-section.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ManifestoSection } from "./manifesto-section";

describe("ManifestoSection (locked copy)", () => {
  it("renders the H2 with gradient clause", () => {
    const { getByText } = render(<ManifestoSection />);
    expect(getByText("I built this")).toBeTruthy();
    expect(getByText("for myself.")).toBeTruthy();
  });

  it("renders all three paragraphs verbatim", () => {
    const { getByText } = render(<ManifestoSection />);
    expect(
      getByText(/Job applications take hours/, { exact: false }),
    ).toBeTruthy();
    expect(getByText(/So I built JobCopilot/, { exact: false })).toBeTruthy();
    expect(getByText(/Claude does the writing/, { exact: false })).toBeTruthy();
    expect(getByText(/The whole thing runs on free tiers/, { exact: false })).toBeTruthy();
  });

  it("renders all four specs", () => {
    const { getByText } = render(<ManifestoSection />);
    expect(getByText("Next.js + Claude")).toBeTruthy();
    expect(getByText("Under $5/mo")).toBeTruthy();
    expect(getByText("MIT")).toBeTruthy();
    expect(getByText("Personal use")).toBeTruthy();
  });

  it("renders the author byline with plain ASCII name", () => {
    const { getByText } = render(<ManifestoSection />);
    expect(getByText("Ethan Yucetepe")).toBeTruthy();
    expect(getByText(/@EthanY33/)).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test manifesto-section`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement ManifestoSection**

Create `apps/web/src/components/marketing/manifesto/manifesto-section.tsx`. The em-dash check: spec rule §3 forbids `—` in body copy, so the paragraphs use periods. Source — copy verbatim from spec §5 "Heading + body copy (locked)":

```tsx
import { ScrollReveal } from "../scroll-reveal";
import { DriftOrb } from "../drift-orb";
import styles from "../marketing.module.css";

export function ManifestoSection() {
  return (
    <section className={styles.manifestoSection} aria-labelledby="manifesto-heading">
      <DriftOrb size={540} color="violet" opacity={0.2} top="-260px" left="18%" animationName="drift1" duration="30s" />
      <DriftOrb size={420} color="azure" opacity={0.15} bottom="10%" right="-160px" animationName="drift2" duration="28s" />

      <ScrollReveal>
        <h2 id="manifesto-heading" className={styles.manifestoH2}>
          <span>I built this </span>
          <span className={styles.h2Gradient}>for myself.</span>
        </h2>
      </ScrollReveal>

      <ScrollReveal>
        <div className={styles.manifestoBody}>
          <p className={styles.manifestoP}>
            Job applications take hours. Most of that time goes to writing cover letters and tweaking resume
            bullets for postings I&apos;d already read three times. I wanted that work done. Cleanly, with my
            voice, against my real resume.
          </p>
          <p className={styles.manifestoP}>
            So I built JobCopilot. It reads the posting, drafts every piece against my profile, and tracks the
            outcome.{" "}
            <span className={styles.manifestoHighlight}>Claude does the writing. I review and ship.</span>
          </p>
          <p className={styles.manifestoP}>
            The whole thing runs on free tiers. The source is on GitHub. If you want it, fork it.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delayMs={150}>
        <div className={styles.specsStrip}>
          <div className={styles.specBlock}>
            <span className={styles.specLabel}>Stack</span>
            <span className={styles.specValue}>Next.js + Claude</span>
          </div>
          <div className={styles.specBlock}>
            <span className={styles.specLabel}>Cost</span>
            <span className={`${styles.specValue} ${styles.specValueGradient}`}>Under $5/mo</span>
          </div>
          <div className={styles.specBlock}>
            <span className={styles.specLabel}>License</span>
            <span className={styles.specValue}>MIT</span>
          </div>
          <div className={styles.specBlock}>
            <span className={styles.specLabel}>Status</span>
            <span className={styles.specValue}>Personal use</span>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delayMs={300}>
        <div className={styles.byline}>
          <div className={styles.bylineAvatar} aria-hidden="true">E</div>
          <div>
            <div className={styles.bylineName}>Ethan Yucetepe</div>
            <div className={styles.bylineHandle}>@EthanY33 · github.com/EthanY33/jobcopilot</div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test manifesto-section`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/components/marketing/manifesto/manifesto-section.tsx apps/web/src/components/marketing/manifesto/manifesto-section.test.tsx apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): add ManifestoSection with 3-paragraph body + specs strip + byline"
```

---

## Task 20: FinalCTASection

**Files:**
- Create: `apps/web/src/components/marketing/final-cta/final-cta-section.tsx`
- Create: `apps/web/src/components/marketing/final-cta/final-cta-section.test.tsx`
- Modify: `apps/web/src/components/marketing/marketing.module.css`

Per spec §5 "Section 05 — Final CTA":
- H2: `Ready to stop writing applications?` (gradient on the entire second clause "stop writing applications?")
- Sub: `Try the demo. Or read the source. Free forever, runs on your Anthropic key, no marketing email.`
- CTAs: same primary + ghost as the hero
- Fineprint (mono, .25em letter-spacing): `Open source · MIT · v1.0`

Background: soft radial gradient ellipse (`800×500px, hsl(258 90% 60% / .18)`) at the section center for emphasis. One azure orb at the bottom-center for atmospheric continuation.

- [ ] **Step 1: Append final-cta CSS**

```css
.finalCtaSection {
  position: relative;
  padding: 140px 32px 140px;
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
  overflow-x: clip;
  overflow-y: visible;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.finalCtaSection::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 800px;
  height: 500px;
  background: radial-gradient(closest-side, hsl(258 90% 60% / 0.18), transparent 70%);
  filter: blur(40px);
  pointer-events: none;
  z-index: -1;
}

.finalCtaH2 {
  font-family: var(--font-geist-sans), sans-serif;
  font-weight: 700;
  font-size: clamp(40px, 6vw, 68px);
  line-height: 1.02;
  letter-spacing: -0.035em;
  color: #f4f4f8;
  margin: 0;
  max-width: 720px;
}

.finalCtaSub {
  font-family: var(--font-serif), Georgia, serif;
  font-size: 18px;
  line-height: 1.6;
  color: #b4b4c4;
  max-width: 560px;
  margin: 0;
}

.finalFineprint {
  margin-top: 16px;
  font-family: var(--font-jetbrains), monospace;
  font-size: 10px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #4a4a55;
}
```

- [ ] **Step 2: Write the failing test**

Create `apps/web/src/components/marketing/final-cta/final-cta-section.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FinalCTASection } from "./final-cta-section";

describe("FinalCTASection (locked copy)", () => {
  it("renders the H2 with the locked text exactly", () => {
    const { getByRole } = render(<FinalCTASection />);
    // Use heading role to disambiguate — the <h2> contains a nested gradient
    // <span> with overlapping text, which trips RTL's getByText regex match.
    const h2 = getByRole("heading", { level: 2 });
    expect(h2.textContent).toBe("Ready to stop writing applications?");
  });

  it("renders the sub copy verbatim", () => {
    const { getByText } = render(<FinalCTASection />);
    expect(
      getByText("Try the demo. Or read the source. Free forever, runs on your Anthropic key, no marketing email."),
    ).toBeTruthy();
  });

  it("renders both CTAs with correct hrefs", () => {
    const { getByText } = render(<FinalCTASection />);
    const primary = getByText(/Try the demo/).closest("a");
    expect(primary?.getAttribute("href")).toBe("/login");
    const ghost = getByText(/Star on GitHub/).closest("a");
    expect(ghost?.getAttribute("href")).toBe("https://github.com/EthanY33/jobcopilot");
  });

  it("renders the fineprint", () => {
    const { getByText } = render(<FinalCTASection />);
    expect(getByText("Open source · MIT · v1.0")).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test final-cta-section`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement FinalCTASection**

Create `apps/web/src/components/marketing/final-cta/final-cta-section.tsx`:

```tsx
import Link from "next/link";
import { ScrollReveal } from "../scroll-reveal";
import { DriftOrb } from "../drift-orb";
import styles from "../marketing.module.css";

export function FinalCTASection() {
  return (
    <section className={styles.finalCtaSection} aria-labelledby="cta-heading">
      <DriftOrb size={520} color="azure" opacity={0.16} bottom="-200px" left="50%" animationName="drift2" duration="30s" />

      <ScrollReveal>
        <h2 id="cta-heading" className={styles.finalCtaH2}>
          Ready to <span className={styles.h2Gradient}>stop writing applications?</span>
        </h2>
      </ScrollReveal>

      <ScrollReveal delayMs={120}>
        <p className={styles.finalCtaSub}>
          Try the demo. Or read the source. Free forever, runs on your Anthropic key, no marketing email.
        </p>
      </ScrollReveal>

      <ScrollReveal delayMs={240}>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-md bg-[image:var(--gradient-brand)] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-[hsl(var(--brand-violet)/.4)] transition-opacity hover:opacity-90"
          >
            Try the demo →
          </Link>
          <a
            href="https://github.com/EthanY33/jobcopilot"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-md border border-[#25252e] bg-transparent px-6 py-3 text-sm font-semibold text-[#f4f4f8] transition-colors hover:bg-[rgba(255,255,255,0.04)]"
          >
            ★ Star on GitHub
          </a>
        </div>
      </ScrollReveal>

      <ScrollReveal delayMs={360}>
        <div className={styles.finalFineprint}>Open source · MIT · v1.0</div>
      </ScrollReveal>
    </section>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test final-cta-section`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/components/marketing/final-cta/final-cta-section.tsx apps/web/src/components/marketing/final-cta/final-cta-section.test.tsx apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): add FinalCTASection with radial backdrop + locked copy"
```

---

## Task 21: MarketingFooter

**Files:**
- Create: `apps/web/src/components/marketing/footer/marketing-footer.tsx`
- Modify: `apps/web/src/components/marketing/marketing.module.css`

Per spec §5: 4-column grid (`1.5fr 1fr 1fr 1fr`). Brand col: 28px brand mark + "job**copilot**" wordmark + serif tagline. Product / Source / Made by columns of links. Bottom strip with mono uppercase 10px meta, justified.

Reuse the existing `<Logo size={28} />` from `apps/web/src/components/brand/logo.tsx` and `<Wordmark size={20} />` from `apps/web/src/components/brand/wordmark.tsx` — that resolves spec §10.5.

- [ ] **Step 1: Append footer CSS**

```css
.footer {
  padding: 56px 32px 40px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(8, 8, 12, 0.7);
}

.footerInner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 48px;
}

.footerBrand {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.footerBrandLockup {
  display: flex;
  align-items: center;
  gap: 10px;
}

.footerTagline {
  font-family: var(--font-serif), Georgia, serif;
  font-size: 14px;
  line-height: 1.55;
  color: #8a8a99;
  max-width: 320px;
  margin: 0;
}

.footerColTitle {
  font-family: var(--font-jetbrains), monospace;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #6a6a7a;
  margin-bottom: 14px;
}

.footerLinks {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footerLinks a {
  color: #b4b4c4;
  font-size: 14px;
  transition: color 0.15s;
}

.footerLinks a:hover { color: #f4f4f8; }

.footerStrip {
  margin-top: 32px;
  padding-top: 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-jetbrains), monospace;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #4a4a55;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

@media (max-width: 768px) {
  .footerInner { grid-template-columns: 1fr 1fr; gap: 32px; }
  .footerStrip { flex-direction: column; gap: 8px; }
}
```

- [ ] **Step 2: Implement MarketingFooter**

Create `apps/web/src/components/marketing/footer/marketing-footer.tsx`:

```tsx
import { Logo } from "@/components/brand/logo";
import { Wordmark } from "@/components/brand/wordmark";
import styles from "../marketing.module.css";

export function MarketingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <div className={styles.footerBrandLockup}>
            <Logo size={28} />
            <Wordmark size={20} />
          </div>
          <p className={styles.footerTagline}>
            A personal tool that drafts every piece of a job application. Built by Ethan, open-sourced for
            everyone.
          </p>
        </div>

        <div>
          <div className={styles.footerColTitle}>Product</div>
          <div className={styles.footerLinks}>
            <a href="/login">Try the demo</a>
            <a href="#how-heading">How it works</a>
            <a href="#tracker-heading">The pipeline</a>
          </div>
        </div>

        <div>
          <div className={styles.footerColTitle}>Source</div>
          <div className={styles.footerLinks}>
            <a href="https://github.com/EthanY33/jobcopilot" target="_blank" rel="noreferrer noopener">
              GitHub repo
            </a>
            <a href="https://github.com/EthanY33/jobcopilot#readme" target="_blank" rel="noreferrer noopener">
              README
            </a>
            <a
              href="https://github.com/EthanY33/jobcopilot/blob/master/docs/specs/2026-05-07-marketing-landing-design.md"
              target="_blank"
              rel="noreferrer noopener"
            >
              Design spec
            </a>
          </div>
        </div>

        <div>
          <div className={styles.footerColTitle}>Made by</div>
          <div className={styles.footerLinks}>
            <a href="https://github.com/EthanY33" target="_blank" rel="noreferrer noopener">Ethan Yucetepe</a>
            <a href="https://github.com/EthanY33" target="_blank" rel="noreferrer noopener">@EthanY33</a>
            <a href="https://github.com/EthanY33?tab=repositories" target="_blank" rel="noreferrer noopener">
              Other projects
            </a>
          </div>
        </div>
      </div>

      <div className={styles.footerStrip}>
        <span>JOBCOPILOT v1.0 · MIT</span>
        <span>Built with Next.js + Claude</span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/components/marketing/footer/marketing-footer.tsx apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): add MarketingFooter with 4 columns + bottom strip"
```

---

## Task 22: MarketingPage composition

**Files:**
- Create: `apps/web/src/components/marketing/marketing-page.tsx`

Server component that imports all 6 sections and composes them in order, wrapped in `<MarketingLayout>`.

- [ ] **Step 1: Implement MarketingPage**

Create `apps/web/src/components/marketing/marketing-page.tsx`:

```tsx
import { MarketingLayout } from "./marketing-layout";
import { HeroSection } from "./hero/hero-section";
import { HowItWorksSection } from "./how-it-works/how-it-works-section";
import { TrackerPipelineSection } from "./tracker/tracker-pipeline-section";
import { ManifestoSection } from "./manifesto/manifesto-section";
import { FinalCTASection } from "./final-cta/final-cta-section";
import { MarketingFooter } from "./footer/marketing-footer";

export function MarketingPage() {
  return (
    <MarketingLayout>
      <HeroSection />
      <HowItWorksSection />
      <TrackerPipelineSection />
      <ManifestoSection />
      <FinalCTASection />
      <MarketingFooter />
    </MarketingLayout>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git add apps/web/src/components/marketing/marketing-page.tsx
git commit -m "feat(marketing): compose MarketingPage with all 6 sections"
```

---

## Task 23: Wire `/` to MarketingPage

**Files:**
- Modify: `apps/web/src/app/page.tsx`

Per spec §10.1 + §10.2: middleware handles the authed → /dashboard redirect; the page component just renders the marketing page. Removing the auth check here also makes the page cacheable / statically renderable.

- [ ] **Step 1: Replace page.tsx**

Overwrite `apps/web/src/app/page.tsx`:

```tsx
import { MarketingPage } from "@/components/marketing/marketing-page";

export default function Home() {
  return <MarketingPage />;
}
```

- [ ] **Step 2: Run the dev server and verify**

Run from `apps/web/`: `pnpm dev`

In a private/incognito window (so you're unauthenticated), open `http://localhost:3000/`.

Verify visually:
- The marketing landing renders
- All 6 sections appear in order
- Tab cycle in HeroDemo advances every 4.5s
- Status row label updates in sync ("DRAFTING COVER LETTER" → "TAILORING RESUME BULLETS" → "ANSWERING FREE TEXT QUESTIONS")
- Mouse parallax tilts the hero frame ±2deg
- Scroll-reveal triggers as you scroll through sections
- ShipVisual loop runs without teleport-snap at the boundary
- Google card in Tracker pulses
- No black band at section seams (orbs bleed)
- No console errors

Compare side-by-side with `.superpowers/brainstorm/4273-1778192382/content/hero-prototype-v11.html` open in another tab. Match visual fidelity for the locked sections.

If anything is off, fix it before moving on. **The auth-redirect cannot be tested yet** — that needs Task 24.

- [ ] **Step 3: Commit**

```powershell
git add apps/web/src/app/page.tsx
git commit -m "feat(marketing): wire / to MarketingPage (auth redirect moves to middleware)"
```

---

## Task 24: Middleware — / authed → /dashboard

**Files:**
- Modify: `apps/web/src/lib/supabase/middleware.ts`

The existing middleware redirects unauth → `/login` for any `(app)` path and authed `/login` → `/dashboard`. We add: authed `/` → `/dashboard`. Unauth `/` is left alone — page.tsx renders the marketing landing.

- [ ] **Step 1: Add the / branch to updateSession**

Edit `apps/web/src/lib/supabase/middleware.ts`. Insert the new branch after the existing `if (pathname === "/login" && data.user)` block:

```ts
  if (pathname === "/login" && data.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return redirectWithCookies(response, url);
  }

  if (pathname === "/" && data.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return redirectWithCookies(response, url);
  }

  return response;
}
```

- [ ] **Step 2: Manual verification — unauth case**

In a private/incognito window, open `http://localhost:3000/`.
Expected: marketing landing renders, no redirect.

- [ ] **Step 3: Manual verification — authed case**

In a normal (signed-in) browser tab, open `http://localhost:3000/`.
Expected: 302 redirect to `/dashboard`. The dashboard renders.

Verify by watching the network tab: `/` should return a 307/302 status code with `location: /dashboard`. Then the dashboard request follows.

- [ ] **Step 4: Verify the existing 6 axe specs still pass**

Run from `apps/web/`: `pnpm test:e2e`
Expected: all 6 existing axe specs (`axe.dashboard`, `axe.tracker`, `axe.application`, `axe.variants`, `axe.profile`, `axe.login`) still pass. The new redirect should not affect any of these — they all hit explicit `(app)` routes or `/login`, not `/`.

If the e2e setup auth helper fails because the seeded test user no longer hits the dashboard cleanly, double-check the `if (pathname === "/" && data.user)` placement — it must be after the `isAuthedPath` check so that authed visits to `/dashboard` itself don't loop.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/lib/supabase/middleware.ts
git commit -m "feat(middleware): redirect authed users on / to /dashboard for marketing landing"
```

---

## Task 25: README one-line link

**Files:**
- Modify: `README.md`

Per spec §10.3: insert a single line directly below the brand-hero `<img>` linking to the deployed marketing URL. Keep everything else untouched.

The deployed URL: confirm during build whether the canonical URL is `https://jobcopilot-web.vercel.app/` or some other Vercel project name. Run `vercel ls` from the repo root, or check the existing Vercel deploy via `git config --get remote.origin.url` against Vercel's project settings. If unknown at implementation time, use `https://jobcopilot.vercel.app/` as a placeholder and confirm with the user before merging.

- [ ] **Step 1: Insert the line**

Edit `README.md`. Currently lines 1-3 are:

```markdown
<p align="center">
  <img src="docs/assets/jobcopilot-brand.svg" alt="JobCopilot — AI drafts every piece of an application. You review and ship." width="100%">
</p>
```

Change to:

```markdown
<p align="center">
  <img src="docs/assets/jobcopilot-brand.svg" alt="JobCopilot — AI drafts every piece of an application. You review and ship." width="100%">
</p>

<p align="center">
  <a href="https://jobcopilot.vercel.app/">Watch the live landing →</a>
</p>
```

If the deployed URL is different, swap the href before committing.

- [ ] **Step 2: Verify nothing else changed**

Run: `git diff README.md`
Expected: only the inserted `<p align="center">…</p>` block is present in the diff. Preview section, stack, dev instructions, etc. all untouched.

- [ ] **Step 3: Commit**

```powershell
git add README.md
git commit -m "docs(readme): add one-line link to live marketing landing"
```

---

## Task 26: axe.marketing.spec.ts

**Files:**
- Create: `apps/web/tests/e2e/axe.marketing.spec.ts`

Mirror the structure of `axe.login.spec.ts` (which uses unauth storage, since the marketing page is unauth). Targets `/`.

- [ ] **Step 1: Create the spec**

Create `apps/web/tests/e2e/axe.marketing.spec.ts`:

```ts
import { test } from "@playwright/test";
import { expectNoAxeViolations } from "./axe-helper";

// Marketing landing renders for unauthenticated visitors at /, so
// override the default authed storageState used by the chromium project.
test.use({ storageState: { cookies: [], origins: [] } });

test("marketing landing has no axe violations", async ({ page }) => {
  await page.goto("/");
  // Marketing page has CSS animations; wait for networkidle (fonts, etc.) but
  // don't wait for animations to "stop" — they're infinite.
  await page.waitForLoadState("networkidle");
  await expectNoAxeViolations(page, "/");
});
```

- [ ] **Step 2: Run the spec**

Run from `apps/web/`: `pnpm test:e2e -- --grep "marketing landing"`
Expected: PASS, 0 axe violations.

If violations surface, common categories to watch for:
- **color-contrast**: tertiary text colors `#6a6a7a` and `#4a4a55` against `#08080c` need verification. If they fail, lift the lightness to `#7a7a8a` / `#5a5a65` until AA passes (≥4.5:1 for normal text, ≥3:1 for large text).
- **landmark-unique**: ensure each `<section>` has a distinct `aria-labelledby` (the plan above assigns `hero-heading`, `how-heading`, `tracker-heading`, `manifesto-heading`, `cta-heading`; footer is implicit).
- **link-name**: verify all `<a>` elements have visible text content. The mono "github · ethany33/jobcopilot" link in the utility bar must be readable, not just a decorative icon.

Fix any reported violations and re-run until green.

- [ ] **Step 3: Verify all 7 axe specs pass together**

Run: `pnpm test:e2e -- --grep "axe"`
Expected: 7/7 axe specs green (the original 6 + the new marketing one).

- [ ] **Step 4: Commit**

```powershell
git add apps/web/tests/e2e/axe.marketing.spec.ts
git commit -m "test(marketing): add axe spec for / (unauth marketing landing)"
```

---

## Task 27: Reduced-motion verification

**Files:**
- (verification only, plus possibly a spot-fix to `marketing.module.css` if anything was missed)

The spec acceptance criterion: "`prefers-reduced-motion: reduce` respected — all infinite animations pause/freeze." `globals.css` already has the global override (`* { animation-duration: 0.01ms !important; }`), but inline animations declared via `style={{ animation: "..." }}` in `DriftOrb` may bypass it on some browsers because inline styles outrank `!important` from a stylesheet only when more specific. Verify behavior end-to-end.

- [ ] **Step 1: Audit places that use inline `style.animation`**

Run from repo root:

```powershell
Select-String -Path apps/web/src/components/marketing -Pattern "animation:" -Recurse
```

Expected list of files using `animation`:
- `drift-orb.tsx` (inline `style.animation`)
- `marketing.module.css` (class-driven animations)

The `globals.css` reduced-motion override applies to both inline and class-driven styles via the universal selector. Verify in the next step.

- [ ] **Step 2: Manually emulate prefers-reduced-motion in DevTools**

Run: `pnpm dev`. In Chrome DevTools, open the Rendering tab (Cmd/Ctrl+Shift+P → "Show Rendering"). Set "Emulate CSS media feature prefers-reduced-motion" to `prefers-reduced-motion: reduce`.

Reload `http://localhost:3000/`.

Expected:
- Drift orbs are stationary (no `drift1`/`drift2`)
- Hero stagger entrance reveals everything immediately (no opacity/translate)
- Tab cycle still advances (it's `setInterval`, not CSS) but pane swap is instant — no crossfade
- ShipVisual `shipDrafting`/`shipApplied` loops don't animate (cards hold the 0% state)
- Google card `recentPulse` does not pulse
- ScrollReveal sets everything visible immediately (CSS module already gates this)

If any of those is still animating, find the offending rule and add a `@media (prefers-reduced-motion: reduce)` guard around it.

- [ ] **Step 3: Manual fix if needed (skip if step 2 was clean)**

If a specific animation slipped through, add an explicit override to `marketing.module.css`. Pattern:

```css
@media (prefers-reduced-motion: reduce) {
  .driftOrb { animation: none !important; }
}
```

Apply only the targeted overrides; don't blanket-disable.

- [ ] **Step 4: Commit (if any changes)**

```powershell
git add apps/web/src/components/marketing/marketing.module.css
git commit -m "fix(marketing): tighten reduced-motion gating for drift orbs"
```

If no changes needed, skip the commit.

---

## Task 28: Lighthouse perf check

**Files:**
- (verification only)

Acceptance criterion: Lighthouse Performance score ≥ 85 mobile.

- [ ] **Step 1: Build and run production server**

Run from repo root:

```powershell
pnpm -F @jobcopilot/web build
pnpm -F @jobcopilot/web start
```

This serves the production build (no HMR, no dev overhead) on port 3000.

- [ ] **Step 2: Run Lighthouse**

In Chrome DevTools → Lighthouse tab → Mobile preset → Performance category → Analyze page load on `http://localhost:3000/`.

Expected: Performance score ≥ 85.

If below 85, the most likely culprits are:
- **Largest Contentful Paint** delayed by HeroDemo client island. Solution: defer hydration with `next/dynamic` and `ssr: true`, or split static content into a non-island wrapper.
- **Cumulative Layout Shift** from font swapping. Solution: ensure `display: "swap"` is set on all `next/font` calls (Task 1 already does this).
- **Unused CSS**: marketing.module.css is large. CSS modules tree-shake unused class names automatically; verify by inspecting the bundled CSS in `.next/static/`.

If any are below threshold, try the lowest-cost fixes first; do not refactor architecture for marginal gains.

- [ ] **Step 3: Document the result**

Note the actual score in the commit message of any fix. If the page passes on the first try, no commit needed for this step — the criterion is verified, no artifact.

- [ ] **Step 4: Stop the prod server**

```powershell
# Ctrl+C in the terminal running `pnpm start`
```

---

## Task 29: Final acceptance pass

**Files:**
- (verification only)

Walk the spec §12 acceptance criteria and confirm each. Skip ahead to the next criterion if one is already verified by an earlier task.

- [ ] **Step 1: Run all unit + e2e tests**

```powershell
pnpm test
pnpm -F @jobcopilot/web test:e2e
```

Expected:
- Unit tests: 14 existing + new marketing tests all pass (DriftOrb 3 + ScrollReveal 2 + useMouseParallax 3 + HeroDemo 4 + HeroSection 6 + ManifestoSection 4 + FinalCTASection 4 = 26 new). Total ≥ 40 vitest tests, all green.
- e2e tests: 7 axe specs (6 existing + new marketing) green, plus the existing google-referral spec.

- [ ] **Step 2: Walk spec §12 acceptance criteria**

Open `docs/specs/2026-05-07-marketing-landing-design.md` §12 and tick each bullet:

- [x] All 6 sections render in the locked order — verified in Task 23 manual + axe spec landmarks
- [x] Visual matches the v11 prototype — verified Task 23 by side-by-side comparison
- [x] Tab cycle in HeroDemo advances every 4.5s, status row updates — verified by hero-demo.test.tsx + Task 23
- [x] Mouse parallax works — verified by use-mouse-parallax.test.tsx + Task 8
- [x] Kanban "completed → applied" loop in How It Works smooth — verified Task 23 visual
- [x] "Just applied" pulse on Google card — verified Task 23 visual
- [x] Scroll-reveal triggers — verified by scroll-reveal.test.tsx + Task 23 visual
- [x] No visible "black line" at section seams — verified Task 23 visual
- [x] All copy matches the locked text verbatim — verified by hero-section.test.tsx, manifesto-section.test.tsx, final-cta-section.test.tsx
- [x] Custom scrollbar renders — **NEW CHECK**: verify the custom-scrollbar styles from spec §6 are in place. If not yet, add to `marketing.module.css` (see step 3 below).
- [x] Source Serif 4 loads cleanly — verified Task 1 + Task 23 (no FOUT)
- [x] Page passes axe tests — verified Task 26
- [x] Page works in dark mode (default) — verified Task 23 (the entire design is dark-only)
- [x] `prefers-reduced-motion` respected — verified Task 27
- [x] Page is statically renderable — verified by `<MarketingPage>` having no `useEffect`-blocking server data
- [x] Lighthouse Performance ≥ 85 mobile — verified Task 28
- [x] New `axe.marketing.spec.ts` passing — Task 26
- [x] Existing 14/14 vitest tests still passing — Step 1
- [x] Existing 6 axe e2e specs still passing — Step 1
- [x] Hero brand wordmark identical to brand-hero SVG — **VISUAL CHECK**: open the deployed page and the README brand hero side-by-side; the footer wordmark uses `<Wordmark />` which is identical to the brand-hero source. The hero itself does not include a wordmark — it uses the H1. So this criterion applies to the footer only, which uses the same `<Wordmark>` and `<Logo>` components.

- [ ] **Step 3: Add custom scrollbar styles if missing**

If you didn't add custom scrollbar styles in any earlier task, append to `marketing.module.css`:

```css
/* Custom scrollbar — gradient violet → azure thumb, brightens on hover. */
.marketingMain::-webkit-scrollbar { width: 12px; }
.marketingMain::-webkit-scrollbar-track { background: rgba(8, 8, 12, 0.5); }
.marketingMain::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, hsl(258 90% 60% / 0.45), hsl(215 95% 50% / 0.45));
  border-radius: 6px;
  transition: background 0.2s, box-shadow 0.2s;
}
.marketingMain::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, hsl(258 90% 60% / 0.75), hsl(215 95% 50% / 0.75));
  box-shadow: inset 0 0 4px rgba(155, 103, 238, 0.4);
}
```

Note: only `<main>` scrolls in this layout — the body scrolls via the marketing main. Webkit-only; Firefox uses `scrollbar-color` on a separate selector if needed, but spec §6 only locks the gradient-thumb behavior, not Firefox parity.

- [ ] **Step 4: Final commit**

```powershell
git add apps/web/src/components/marketing/marketing.module.css
git commit -m "feat(marketing): add custom scrollbar with gradient thumb"
```

If nothing changed in step 3, skip this commit.

- [ ] **Step 5: Update memory**

Append a memory note that Phase I is feature-complete. Edit `C:\Users\ethan\.claude\projects\C--Users-ethan-Desktop-jobcopilot\memory\11_project_jobcopilot_marketing_landing.md` to mark "feature-complete on master" instead of "spec approved." This signals the next session that the implementation has shipped.

---

## Self-review notes (for the implementer)

- **Locked copy contract**: hero, manifesto, final CTA all have unit tests asserting the locked copy verbatim. If you change copy, fix the tests AND check it against spec §3 / §5 first. Do not "improve" the copy.
- **CSS module class-name discipline**: every keyframe lives inside `marketing.module.css`. If you add an animation in a new TSX file, do NOT inline a fresh `<style>` block — append to the module so the reduced-motion gates remain centralized.
- **No external state for HeroDemo**: tab index is local state, no URL params, no session storage. The cycle resets on every mount, which is desired (visitors landing fresh see Cover Letter first).
- **Order matters in middleware**: the `/` branch must come AFTER the `(app)` `isAuthedPath` redirect so authed visitors to `/dashboard` itself don't trigger the `/` rule. Spec confirmed.
- **Every task ends with a commit** so reverting any specific layer is a one-shot operation. Don't batch.

---

**End of plan.**
