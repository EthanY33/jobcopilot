# BYO Anthropic — Phase 2a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shared `ANTHROPIC_API_KEY` server-side env var with per-user BYO Anthropic keys held in browser localStorage and sent as request headers — without touching prompt logic or adding additional providers.

**Architecture:** Hybrid storage: keys live in browser localStorage; each AI-bound fetch carries `x-ai-provider` + `x-ai-key` headers; route handlers read the key in-memory, call Vercel AI SDK with it, and never persist or log it. Per-IP rate limit guards Vercel function-invocation costs.

**Tech Stack:** Next.js 14 App Router, Vercel AI SDK 4.x (`ai`, `@ai-sdk/anthropic`), Upstash Redis free tier (`@upstash/redis`, `@upstash/ratelimit`), Vitest, shadcn/ui.

**Source spec:** `docs/specs/2026-05-04-byo-multi-provider-ai-design.md` (Phase 2a section).

**Phase 2a does NOT include:** OpenAI, Google, Vercel-AI-SDK refactor of `packages/prompts/*`, prompt caching, model curation UI. Those are Phase 2b.

---

## File map

**Created:**
- `apps/web/src/lib/ai-key.ts` — server-side header parser, throws `ApiKeyMissingError`
- `apps/web/src/lib/ai.ts` — Vercel AI SDK wrapper, Anthropic-only for now (replaces `claude.ts`)
- `apps/web/src/lib/rate-limit.ts` — Upstash sliding-window rate limiter
- `apps/web/src/lib/ai-client.ts` — browser helper: read localStorage, return fetch headers
- `apps/web/src/app/api/ai/verify/route.ts` — POST 1-token verify endpoint
- `apps/web/src/app/(app)/settings/page.tsx` — paste key + Test + Clear UI
- `apps/web/src/components/api-key-banner.tsx` — top-of-shell cutover banner
- `apps/web/tests/unit/ai-key.test.ts`
- `apps/web/tests/unit/ai.test.ts`
- `apps/web/tests/unit/rate-limit.test.ts`
- `apps/web/tests/unit/ai-client.test.ts`
- `apps/web/tests/unit/ai-verify-route.test.ts`

**Modified:**
- `apps/web/src/components/app-shell.tsx` — add Settings nav, render banner
- `apps/web/src/app/api/profile/parse-resume/route.ts` — use lib/ai.ts + key from header
- `apps/web/src/app/api/postings/extract/route.ts` — same
- `apps/web/src/app/api/applications/[id]/draft-cover-letter/route.ts` — same
- `apps/web/src/app/api/applications/[id]/suggest-bullets/route.ts` — same
- `apps/web/src/components/cover-letter-drafter.tsx` — disable button when no key
- `apps/web/src/components/bullet-suggester.tsx` — same
- `apps/web/src/components/add-application-dialog.tsx` — same
- `apps/web/src/app/(app)/profile/page.tsx` — disable resume upload when no key
- `apps/web/src/middleware.ts` — log-redaction guard
- `apps/web/package.json` — add `ai`, `@ai-sdk/anthropic`, `@upstash/redis`, `@upstash/ratelimit`

**Deleted:**
- `apps/web/src/lib/claude.ts`
- `ANTHROPIC_API_KEY` lines from root `.env` and `apps/web/.env.local` (and any deploy config)

---

## Task 1: Setup — install deps and provision Upstash Redis

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/.env.local` (add Upstash creds)

- [ ] **Step 1: Create a free Upstash Redis database**

This is a manual prerequisite. Visit https://console.upstash.com → create account (GitHub login is fine) → "Create Database" → name `jobcopilot-ratelimit`, region `us-west-1` (or whatever's closest), tier "Free". Open the database, copy the two values from the REST API panel:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Free tier: 10k commands/day, 256MB. Sufficient for early traffic.

- [ ] **Step 2: Add Upstash creds to env files**

Append to **`apps/web/.env.local`**:
```
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

Also append to root **`.env`** (so future `db:push` runs from the package don't error on missing vars; not strictly needed since these are runtime-only):
```
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

- [ ] **Step 3: Install AI SDK + rate-limit deps**

```bash
pnpm -F @jobcopilot/web add ai @ai-sdk/anthropic @upstash/redis @upstash/ratelimit
```

- [ ] **Step 4: Verify types resolve**

```bash
pnpm -F @jobcopilot/web typecheck
```
Expected: PASS (no new code yet, just deps).

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): add ai sdk and upstash deps for byo phase 2a"
```

(Do NOT commit `.env.local` — it's gitignored. Confirm `git status` shows no env file changes.)

---

## Task 2: `lib/ai-key.ts` — server-side header parser

**Files:**
- Create: `apps/web/src/lib/ai-key.ts`
- Test: `apps/web/tests/unit/ai-key.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/unit/ai-key.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { readKeyFromHeaders, ApiKeyMissingError } from "@/lib/ai-key";

function req(headers: Record<string, string>): Request {
  return new Request("http://x", { headers });
}

describe("readKeyFromHeaders", () => {
  it("returns key when both headers present", () => {
    const r = req({ "x-ai-provider": "anthropic", "x-ai-key": "sk-ant-abc" });
    expect(readKeyFromHeaders(r)).toEqual({ provider: "anthropic", key: "sk-ant-abc" });
  });

  it("throws ApiKeyMissingError when key header missing", () => {
    const r = req({ "x-ai-provider": "anthropic" });
    expect(() => readKeyFromHeaders(r)).toThrow(ApiKeyMissingError);
  });

  it("throws ApiKeyMissingError when provider header missing", () => {
    const r = req({ "x-ai-key": "sk-ant-abc" });
    expect(() => readKeyFromHeaders(r)).toThrow(ApiKeyMissingError);
  });

  it("throws on unknown provider (Phase 2a: only anthropic supported)", () => {
    const r = req({ "x-ai-provider": "openai", "x-ai-key": "sk-xxx" });
    expect(() => readKeyFromHeaders(r)).toThrow(/unsupported provider/i);
  });

  it("trims whitespace on key", () => {
    const r = req({ "x-ai-provider": "anthropic", "x-ai-key": "  sk-ant-abc  " });
    expect(readKeyFromHeaders(r).key).toBe("sk-ant-abc");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm -F @jobcopilot/web test tests/unit/ai-key.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/ai-key'`.

- [ ] **Step 3: Implement `lib/ai-key.ts`**

Create `apps/web/src/lib/ai-key.ts`:

```typescript
export type AiProvider = "anthropic";

export interface AiKey {
  provider: AiProvider;
  key: string;
}

export class ApiKeyMissingError extends Error {
  constructor(message = "API key missing") {
    super(message);
    this.name = "ApiKeyMissingError";
  }
}

export function readKeyFromHeaders(req: Request): AiKey {
  const provider = req.headers.get("x-ai-provider")?.trim();
  const key = req.headers.get("x-ai-key")?.trim();
  if (!provider || !key) {
    throw new ApiKeyMissingError();
  }
  if (provider !== "anthropic") {
    throw new Error(`unsupported provider: ${provider} (Phase 2a is Anthropic-only)`);
  }
  return { provider, key };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm -F @jobcopilot/web test tests/unit/ai-key.test.ts
```
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/ai-key.ts apps/web/tests/unit/ai-key.test.ts
git commit -m "feat(web): lib/ai-key for server-side header parsing"
```

---

## Task 3: `lib/ai.ts` — Vercel AI SDK adapter (Anthropic only)

**Files:**
- Create: `apps/web/src/lib/ai.ts`
- Test: `apps/web/tests/unit/ai.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/unit/ai.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const generateTextMock = vi.fn();
const createAnthropicMock = vi.fn(() => ({
  // returned factory takes a model id and returns a "model" object
  // we don't care about its shape — just that it's passed through to generateText
  __mock: "anthropic-factory",
}));

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: (cfg: { apiKey: string }) => {
    createAnthropicMock(cfg);
    return (modelId: string) => ({ __mock: "anthropic-model", modelId });
  },
}));

import { generate } from "@/lib/ai";

beforeEach(() => {
  generateTextMock.mockReset();
  createAnthropicMock.mockReset();
  generateTextMock.mockResolvedValue({
    text: "hello",
    usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
  });
});

describe("generate", () => {
  it("creates an Anthropic client with the user's key", async () => {
    await generate({
      key: { provider: "anthropic", key: "sk-ant-test" },
      model: "claude-haiku-4-5-20251001",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(createAnthropicMock).toHaveBeenCalledWith({ apiKey: "sk-ant-test" });
  });

  it("passes the model id through to the AI SDK", async () => {
    await generate({
      key: { provider: "anthropic", key: "sk-ant-test" },
      model: "claude-sonnet-4-6",
      messages: [{ role: "user", content: "hi" }],
    });
    const callArg = generateTextMock.mock.calls[0][0];
    expect(callArg.model.modelId).toBe("claude-sonnet-4-6");
  });

  it("returns text and usage from the SDK response", async () => {
    const result = await generate({
      key: { provider: "anthropic", key: "sk-ant-test" },
      model: "claude-haiku-4-5-20251001",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result.text).toBe("hello");
    expect(result.usage.totalTokens).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm -F @jobcopilot/web test tests/unit/ai.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/ai'`.

- [ ] **Step 3: Implement `lib/ai.ts`**

Create `apps/web/src/lib/ai.ts`:

```typescript
import { generateText, type CoreMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { AiKey } from "@/lib/ai-key";

export interface GenerateOptions {
  key: AiKey;
  model: string;
  messages: CoreMessage[];
  system?: string;
  maxTokens?: number;
}

export interface GenerateResult {
  text: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const provider = createAnthropic({ apiKey: opts.key.key });
  const result = await generateText({
    model: provider(opts.model),
    messages: opts.messages,
    system: opts.system,
    maxTokens: opts.maxTokens,
  });
  return { text: result.text, usage: result.usage };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm -F @jobcopilot/web test tests/unit/ai.test.ts
```
Expected: PASS, 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/ai.ts apps/web/tests/unit/ai.test.ts
git commit -m "feat(web): lib/ai vercel-sdk wrapper (anthropic-only for phase 2a)"
```

---

## Task 4: `lib/rate-limit.ts` — Upstash sliding window per IP

**Files:**
- Create: `apps/web/src/lib/rate-limit.ts`
- Test: `apps/web/tests/unit/rate-limit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/unit/rate-limit.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const limitMock = vi.fn();

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn(() => ({ kind: "slidingWindow" }));
    constructor(_cfg: unknown) {}
    limit = limitMock;
  },
}));

vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: vi.fn(() => ({ kind: "redis" })) },
}));

import { checkRateLimit } from "@/lib/rate-limit";

beforeEach(() => {
  limitMock.mockReset();
});

describe("checkRateLimit", () => {
  it("returns ok=true when under the burst limit", async () => {
    limitMock.mockResolvedValueOnce({ success: true, reset: Date.now() + 1000 });
    limitMock.mockResolvedValueOnce({ success: true, reset: Date.now() + 1000 });
    const result = await checkRateLimit("1.2.3.4");
    expect(result.ok).toBe(true);
  });

  it("returns ok=false with retryAfter when burst limit hit", async () => {
    const reset = Date.now() + 30_000;
    limitMock.mockResolvedValueOnce({ success: false, reset });
    const result = await checkRateLimit("1.2.3.4");
    expect(result.ok).toBe(false);
    expect(result.retryAfterSec).toBeGreaterThan(0);
  });

  it("returns ok=false when daily limit hit even if burst is fine", async () => {
    limitMock.mockResolvedValueOnce({ success: true, reset: Date.now() + 1000 });
    limitMock.mockResolvedValueOnce({ success: false, reset: Date.now() + 60_000 });
    const result = await checkRateLimit("1.2.3.4");
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm -F @jobcopilot/web test tests/unit/rate-limit.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/rate-limit.ts`**

Create `apps/web/src/lib/rate-limit.ts`:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const burstLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "5 m"),
  analytics: false,
  prefix: "rl:burst",
});

const dailyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, "24 h"),
  analytics: false,
  prefix: "rl:day",
});

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec?: number;
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const burst = await burstLimiter.limit(ip);
  if (!burst.success) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((burst.reset - Date.now()) / 1000)) };
  }
  const day = await dailyLimiter.limit(ip);
  if (!day.success) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((day.reset - Date.now()) / 1000)) };
  }
  return { ok: true };
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm -F @jobcopilot/web test tests/unit/rate-limit.test.ts
```
Expected: PASS, 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/rate-limit.ts apps/web/tests/unit/rate-limit.test.ts
git commit -m "feat(web): lib/rate-limit upstash sliding window per ip"
```

---

## Task 5: `lib/ai-client.ts` — browser localStorage helper

**Files:**
- Create: `apps/web/src/lib/ai-client.ts`
- Test: `apps/web/tests/unit/ai-client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/unit/ai-client.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { getAiKey, setAiKey, clearAiKeys, hasAiKey, aiHeaders } from "@/lib/ai-client";

beforeEach(() => {
  localStorage.clear();
});

describe("ai-client", () => {
  it("getAiKey returns null when nothing stored", () => {
    expect(getAiKey()).toBeNull();
  });

  it("setAiKey + getAiKey round-trips", () => {
    setAiKey({ provider: "anthropic", key: "sk-ant-x" });
    expect(getAiKey()).toEqual({ provider: "anthropic", key: "sk-ant-x" });
  });

  it("hasAiKey reports presence", () => {
    expect(hasAiKey()).toBe(false);
    setAiKey({ provider: "anthropic", key: "sk-ant-x" });
    expect(hasAiKey()).toBe(true);
  });

  it("clearAiKeys wipes the store", () => {
    setAiKey({ provider: "anthropic", key: "sk-ant-x" });
    clearAiKeys();
    expect(getAiKey()).toBeNull();
  });

  it("aiHeaders returns headers when key is set", () => {
    setAiKey({ provider: "anthropic", key: "sk-ant-x" });
    expect(aiHeaders()).toEqual({
      "x-ai-provider": "anthropic",
      "x-ai-key": "sk-ant-x",
    });
  });

  it("aiHeaders returns empty object when no key set", () => {
    expect(aiHeaders()).toEqual({});
  });

  it("ignores malformed localStorage payload", () => {
    localStorage.setItem("jobcopilot.aiKey", "not-json");
    expect(getAiKey()).toBeNull();
  });

  it("setAiKey dispatches a same-tab change event", () => {
    let fired = 0;
    window.addEventListener("jobcopilot.ai-key-changed", () => fired++);
    setAiKey({ provider: "anthropic", key: "sk-ant-x" });
    expect(fired).toBe(1);
  });

  it("clearAiKeys dispatches a same-tab change event", () => {
    setAiKey({ provider: "anthropic", key: "sk-ant-x" });
    let fired = 0;
    window.addEventListener("jobcopilot.ai-key-changed", () => fired++);
    clearAiKeys();
    expect(fired).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm -F @jobcopilot/web test tests/unit/ai-client.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/ai-client.ts`**

Create `apps/web/src/lib/ai-client.ts`:

```typescript
"use client";

import type { AiKey } from "@/lib/ai-key";

const STORAGE_KEY = "jobcopilot.aiKey";
const CHANGE_EVENT = "jobcopilot.ai-key-changed";

function notify(): void {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getAiKey(): AiKey | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.provider === "anthropic" && typeof parsed.key === "string") {
      return { provider: parsed.provider, key: parsed.key };
    }
    return null;
  } catch {
    return null;
  }
}

export function setAiKey(key: AiKey): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(key));
  notify();
}

export function clearAiKeys(): void {
  localStorage.removeItem(STORAGE_KEY);
  notify();
}

export function hasAiKey(): boolean {
  return getAiKey() !== null;
}

export function aiHeaders(): Record<string, string> {
  const k = getAiKey();
  if (!k) return {};
  return { "x-ai-provider": k.provider, "x-ai-key": k.key };
}
```

Why a custom event: the browser's built-in `storage` event fires only on *other* tabs that share the origin — never in the same tab that did the write. Without a custom event, the API-key banner (in Task 8) would not disappear after saving the key on the same tab where Settings is open. The banner and `useAiKey` hook (Task 10) listen for both `storage` (cross-tab) and `jobcopilot.ai-key-changed` (same-tab).

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm -F @jobcopilot/web test tests/unit/ai-client.test.ts
```
Expected: PASS, 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/ai-client.ts apps/web/tests/unit/ai-client.test.ts
git commit -m "feat(web): lib/ai-client browser localstorage helper"
```

---

## Task 6: `/api/ai/verify` route

**Files:**
- Create: `apps/web/src/app/api/ai/verify/route.ts`
- Test: `apps/web/tests/unit/ai-verify-route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/unit/ai-verify-route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const generateMock = vi.fn();
const checkRateLimitMock = vi.fn();

vi.mock("@/lib/ai", () => ({
  generate: (...args: unknown[]) => generateMock(...args),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  getClientIp: () => "1.2.3.4",
}));
vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
  }),
}));

import { POST } from "@/app/api/ai/verify/route";

beforeEach(() => {
  generateMock.mockReset();
  checkRateLimitMock.mockReset();
  checkRateLimitMock.mockResolvedValue({ ok: true });
});

function req(headers: Record<string, string>): Request {
  return new Request("http://x/api/ai/verify", { method: "POST", headers });
}

describe("POST /api/ai/verify", () => {
  it("returns 200 and ok:true on successful 1-token call", async () => {
    generateMock.mockResolvedValue({ text: "ok", usage: { totalTokens: 2 } });
    const res = await POST(req({ "x-ai-provider": "anthropic", "x-ai-key": "sk-ant-x" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: { provider: "anthropic", key: "sk-ant-x" },
        maxTokens: 1,
      }),
    );
  });

  it("returns 401 unauth when no Supabase user", async () => {
    const { getServerSupabase } = await import("@/lib/supabase/server");
    vi.mocked(getServerSupabase).mockReturnValueOnce({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as unknown as ReturnType<typeof getServerSupabase>);
    const res = await POST(req({ "x-ai-provider": "anthropic", "x-ai-key": "sk-ant-x" }));
    expect(res.status).toBe(401);
  });

  it("returns 402 when no AI key headers", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(402);
  });

  it("returns 429 when rate-limited", async () => {
    checkRateLimitMock.mockResolvedValueOnce({ ok: false, retryAfterSec: 12 });
    const res = await POST(req({ "x-ai-provider": "anthropic", "x-ai-key": "sk-ant-x" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("12");
  });

  it("returns 4xx with provider error message when key is rejected upstream", async () => {
    generateMock.mockRejectedValue(
      Object.assign(new Error("invalid x-api-key"), { statusCode: 401 }),
    );
    const res = await POST(req({ "x-ai-provider": "anthropic", "x-ai-key": "bad-key" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: expect.stringMatching(/invalid/i) });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm -F @jobcopilot/web test tests/unit/ai-verify-route.test.ts
```
Expected: FAIL — module `@/app/api/ai/verify/route` not found.

- [ ] **Step 3: Implement `/api/ai/verify/route.ts`**

Create `apps/web/src/app/api/ai/verify/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { generate } from "@/lib/ai";
import { readKeyFromHeaders, ApiKeyMissingError } from "@/lib/ai-key";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const rl = await checkRateLimit(getClientIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate limit exceeded" },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec ?? 60) } },
    );
  }

  let key;
  try {
    key = readKeyFromHeaders(req);
  } catch (err) {
    if (err instanceof ApiKeyMissingError) {
      return NextResponse.json(
        { error: "no API key — set one up in /settings" },
        { status: 402 },
      );
    }
    throw err;
  }

  try {
    await generate({
      key,
      model: "claude-haiku-4-5-20251001",
      messages: [{ role: "user", content: "ok" }],
      maxTokens: 1,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status =
      err && typeof err === "object" && "statusCode" in err && typeof err.statusCode === "number"
        ? err.statusCode
        : 500;
    const message = err instanceof Error ? err.message : "verify failed";
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm -F @jobcopilot/web test tests/unit/ai-verify-route.test.ts
```
Expected: PASS, 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/ai/verify/route.ts apps/web/tests/unit/ai-verify-route.test.ts
git commit -m "feat(web): /api/ai/verify endpoint with rate-limit guard"
```

---

## Task 7: `/settings` page (UI)

**Files:**
- Create: `apps/web/src/app/(app)/settings/page.tsx`

(No unit test — matches existing convention for `(app)/*/page.tsx` files.)

- [ ] **Step 1: Implement the Settings page**

Create `apps/web/src/app/(app)/settings/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAiKey,
  setAiKey,
  clearAiKeys,
  hasAiKey,
  aiHeaders,
} from "@/lib/ai-client";

type VerifyState = "idle" | "testing" | "ok" | "error";

export default function SettingsPage() {
  const [keyValue, setKeyValue] = useState("");
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number>(0);

  useEffect(() => {
    const k = getAiKey();
    if (k) setKeyValue(k.key);
  }, []);

  async function test() {
    setVerifyState("testing");
    setErrorMsg(null);
    try {
      const r = await fetch("/api/ai/verify", {
        method: "POST",
        headers: {
          "x-ai-provider": "anthropic",
          "x-ai-key": keyValue.trim(),
        },
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setErrorMsg(typeof body.error === "string" ? body.error : `HTTP ${r.status}`);
        setVerifyState("error");
        return;
      }
      setAiKey({ provider: "anthropic", key: keyValue.trim() });
      setVerifyState("ok");
      setSavedAt(Date.now());
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "verify failed");
      setVerifyState("error");
    }
  }

  function clearAll() {
    if (!confirm("Clear stored API key from this browser?")) return;
    clearAiKeys();
    setKeyValue("");
    setVerifyState("idle");
    setErrorMsg(null);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-medium">API Key</h2>
          <p className="text-sm text-muted-foreground">
            JobCopilot uses your own Anthropic API key for all AI features. Get one
            at{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              console.anthropic.com
            </a>
            .
          </p>
        </div>

        <div className="space-y-2">
          <Label>Anthropic key</Label>
          <Input
            type="password"
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
            placeholder="sk-ant-..."
          />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={test} disabled={!keyValue.trim() || verifyState === "testing"}>
            {verifyState === "testing" ? "Testing…" : "Test & save"}
          </Button>
          {hasAiKey() && (
            <Button variant="ghost" onClick={clearAll}>
              Clear all keys
            </Button>
          )}
          {verifyState === "ok" && savedAt > 0 && (
            <span className="text-sm text-emerald-600">Saved.</span>
          )}
          {verifyState === "error" && errorMsg && (
            <span className="text-sm text-destructive">{errorMsg}</span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Test makes a 1-token completion call. Costs about $0.0001 from your provider.
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-6 space-y-2 text-sm">
        <h2 className="text-lg font-medium">Your keys stay in your browser.</h2>
        <p className="text-muted-foreground">
          JobCopilot stores API keys only in your browser's localStorage — never on
          our servers. Each AI request sends your key over HTTPS to our server,
          which forwards it to the provider you've selected. We do not log or store
          your keys.
        </p>
        <p className="text-muted-foreground">
          <strong>Keys are per-device.</strong> Sign in on a new browser? You'll
          need to re-enter your keys.
        </p>
      </section>
    </div>
  );
}

// silence unused-import warning for aiHeaders (consumers import it)
void aiHeaders;
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm -F @jobcopilot/web typecheck
```
Expected: PASS.

- [ ] **Step 3: Manual smoke (server is presumed running on `localhost:3000`)**

Sign in, navigate manually to `http://localhost:3000/settings`. Page renders. Pasting an obviously-bad key and clicking Test should display an Anthropic 4xx error (the key is rejected; this is the path we want to confirm exists). Pasting your real key and clicking Test should show "Saved." and store to localStorage.

(If you don't have a real key handy, leave verification for the smoke-test in Task 13 — typecheck passing is enough to commit.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(app\)/settings/page.tsx
git commit -m "feat(web): /settings page for byo anthropic key"
```

---

## Task 8: API key banner + Settings nav in app shell

**Files:**
- Create: `apps/web/src/components/api-key-banner.tsx`
- Modify: `apps/web/src/components/app-shell.tsx`

- [ ] **Step 1: Implement the banner component**

Create `apps/web/src/components/api-key-banner.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { hasAiKey } from "@/lib/ai-client";

export function ApiKeyBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!hasAiKey());
    function refresh() {
      setShow(!hasAiKey());
    }
    window.addEventListener("storage", refresh);
    window.addEventListener("jobcopilot.ai-key-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("jobcopilot.ai-key-changed", refresh);
    };
  }, []);

  if (!show) return null;
  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      JobCopilot now uses your own AI key — set one up in{" "}
      <Link href="/settings" className="font-medium underline">
        Settings
      </Link>{" "}
      to use AI features.
    </div>
  );
}
```

- [ ] **Step 2: Add Settings to nav and render banner in app-shell**

Modify `apps/web/src/components/app-shell.tsx`:

Replace the imports block top of file:
```typescript
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, KanbanSquare, User, Files, Settings, LogOut } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { ApiKeyBanner } from "@/components/api-key-banner";
```

Replace the `NAV` array:
```typescript
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tracker", label: "Tracker", icon: KanbanSquare },
  { href: "/variants", label: "Resume Variants", icon: Files },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];
```

Wrap the existing main column with the banner. Find the main `<div>` that contains the page content (`<main>` or the right-side content panel) and prepend `<ApiKeyBanner />`. The exact placement depends on the existing JSX structure — render the banner as the first child of whatever wraps the page content (sibling to the sidebar).

- [ ] **Step 3: Verify typecheck**

```bash
pnpm -F @jobcopilot/web typecheck
```
Expected: PASS.

- [ ] **Step 4: Manual sanity**

In the browser at `localhost:3000`, log in with no key in localStorage → confirm amber banner shows on every app page (dashboard, tracker, variants, profile). Click Settings link → banner persists until a key is saved.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/api-key-banner.tsx apps/web/src/components/app-shell.tsx
git commit -m "feat(web): api-key banner and settings nav link"
```

---

## Task 9: Refactor existing route handlers to read key from header

**Files:**
- Modify: `apps/web/src/app/api/profile/parse-resume/route.ts`
- Modify: `apps/web/src/app/api/postings/extract/route.ts`
- Modify: `apps/web/src/app/api/applications/[id]/draft-cover-letter/route.ts`
- Modify: `apps/web/src/app/api/applications/[id]/suggest-bullets/route.ts`

The pattern is identical for all four files:

1. Replace `import { getClaude } from "@/lib/claude"` with `import { generate } from "@/lib/ai"`.
2. Add `import { readKeyFromHeaders, ApiKeyMissingError } from "@/lib/ai-key"`.
3. Add `import { checkRateLimit, getClientIp } from "@/lib/rate-limit"`.
4. Top of handler (after auth check): rate-limit check (return 429 on fail), key extraction (return 402 on `ApiKeyMissingError`).
5. Replace the `claude.messages.create({...})` call with `generate({ key, model, messages, system, maxTokens })`. The result has `.text` (was `response.content[0].text`) and `.usage`.

**The prompt builders in `packages/prompts/*` still return Anthropic-shaped requests.** For Phase 2a, extract just `messages`, `system`, `model`, `maxTokens` from those builders' outputs and discard the rest (the SDK handles the wire format). Phase 2b refactors the prompts package to return a portable shape.

**Result-shape shim used by every route below.** All four existing parsers (`parseJobExtractionResponse`, `parseResumeResponse`, `parseCoverLetterResponse`, `parseBulletSuggestionsResponse`) take a full `Anthropic.Messages.Message`. The AI SDK's `generate()` returns `{ text, usage }`. Wrap the AI SDK result before passing to the parser:

```typescript
import type Anthropic from "@anthropic-ai/sdk";

function asAnthropicMessage(text: string): Anthropic.Messages.Message {
  return {
    id: "ai-sdk",
    type: "message",
    role: "assistant",
    model: "claude",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
    content: [{ type: "text", text, citations: null }],
  } as unknown as Anthropic.Messages.Message;
}
```

This shim is repeated locally in each refactored route handler to keep diffs self-contained. Phase 2b removes both the shim and the parsers themselves when `packages/prompts/*` is rewritten to use `generateObject`.

- [ ] **Step 1: Refactor `/api/postings/extract/route.ts`**

Open the file. Replace `import { getClaude } from "@/lib/claude"` (or `getClaude` usage) with the new imports:

```typescript
import { generate } from "@/lib/ai";
import { readKeyFromHeaders, ApiKeyMissingError } from "@/lib/ai-key";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { CoreMessage } from "ai";
import type Anthropic from "@anthropic-ai/sdk";
```

After the existing auth block, add the rate-limit + key extraction:

```typescript
const rl = await checkRateLimit(getClientIp(req));
if (!rl.ok) {
  return NextResponse.json(
    { error: "rate limit" },
    { status: 429, headers: { "retry-after": String(rl.retryAfterSec ?? 60) } },
  );
}

let key;
try {
  key = readKeyFromHeaders(req);
} catch (e) {
  if (e instanceof ApiKeyMissingError) {
    return NextResponse.json({ error: "no api key" }, { status: 402 });
  }
  throw e;
}
```

Replace the Claude call. The prompt builder returns Anthropic-SDK-shaped fields; extract what the AI SDK needs and shim the result back into Anthropic shape for the existing parser:

```typescript
const reqShape = buildJobExtractionRequest({ url, html });
const result = await generate({
  key,
  model: reqShape.model,
  messages: reqShape.messages as CoreMessage[],
  system: typeof reqShape.system === "string" ? reqShape.system : undefined,
  maxTokens: reqShape.max_tokens,
});
const claudeResponse = asAnthropicMessage(result.text);
const extracted = parseJobExtractionResponse(claudeResponse);
```

Drop the `asAnthropicMessage` helper inline at the bottom of the file (or import it from a small new shared location if you prefer — but inline is fine for Phase 2a since it's identical in all four routes).

- [ ] **Step 2: Run the existing test to confirm no regression**

```bash
pnpm -F @jobcopilot/web test tests/unit/scraper.test.ts
```
Expected: PASS (this test doesn't cover the route handler directly, just scraper helpers — but verifies our import changes didn't break the file).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/postings/extract/route.ts
git commit -m "feat(web): /api/postings/extract uses lib/ai + per-request key"
```

- [ ] **Step 4: Refactor `/api/profile/parse-resume/route.ts`**

Same imports. Same rate-limit + key-extraction block. Replace the Claude call:

```typescript
const reqShape = buildResumeParseRequest({ resumeBase64Pdf: b64 });
const result = await generate({
  key,
  model: reqShape.model,
  messages: reqShape.messages as CoreMessage[],
  system: typeof reqShape.system === "string" ? reqShape.system : undefined,
  maxTokens: reqShape.max_tokens,
});
const parsed = parseResumeResponse(asAnthropicMessage(result.text));
```

Add the `asAnthropicMessage` helper inline at the bottom of the file.

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm -F @jobcopilot/web typecheck
git add apps/web/src/app/api/profile/parse-resume/route.ts
git commit -m "feat(web): /api/profile/parse-resume uses lib/ai + per-request key"
```

- [ ] **Step 6: Refactor `/api/applications/[id]/draft-cover-letter/route.ts`**

Same imports + rate-limit + key extraction. Replace the Claude call:

```typescript
const reqShape = buildCoverLetterRequest({ /* existing args */ });
const result = await generate({
  key,
  model: reqShape.model,
  messages: reqShape.messages as CoreMessage[],
  system: typeof reqShape.system === "string" ? reqShape.system : undefined,
  maxTokens: reqShape.max_tokens,
});
const output = parseCoverLetterResponse(asAnthropicMessage(result.text));
```

Preserve the existing usage of `output` (storing into `DraftedContent`, etc.). Add `asAnthropicMessage` inline at the bottom of the file.

```bash
pnpm -F @jobcopilot/web typecheck
git add apps/web/src/app/api/applications/[id]/draft-cover-letter/route.ts
git commit -m "feat(web): /api/applications/[id]/draft-cover-letter uses lib/ai"
```

- [ ] **Step 7: Refactor `/api/applications/[id]/suggest-bullets/route.ts`**

Same imports + rate-limit + key extraction. Replace the Claude call:

```typescript
const reqShape = buildResumeBulletsRequest({ /* existing args */ });
const result = await generate({
  key,
  model: reqShape.model,
  messages: reqShape.messages as CoreMessage[],
  system: typeof reqShape.system === "string" ? reqShape.system : undefined,
  maxTokens: reqShape.max_tokens,
});
const suggestions = parseBulletSuggestionsResponse(asAnthropicMessage(result.text));
```

Preserve existing uses of `suggestions`. Add `asAnthropicMessage` inline at the bottom of the file.

```bash
pnpm -F @jobcopilot/web typecheck
git add apps/web/src/app/api/applications/[id]/suggest-bullets/route.ts
git commit -m "feat(web): /api/applications/[id]/suggest-bullets uses lib/ai"
```

- [ ] **Step 8: Final typecheck**

```bash
pnpm -F @jobcopilot/web typecheck
```
Expected: PASS, no new errors.

---

## Task 10: Disable AI buttons when no key in localStorage

**Files:**
- Modify: `apps/web/src/components/cover-letter-drafter.tsx`
- Modify: `apps/web/src/components/bullet-suggester.tsx`
- Modify: `apps/web/src/components/add-application-dialog.tsx`
- Modify: `apps/web/src/app/(app)/profile/page.tsx`

Each consumer reads `hasAiKey()` and disables its AI-triggering button(s) when false.

- [ ] **Step 1: Add `useAiKey()` hook to ai-client**

Modify `apps/web/src/lib/ai-client.ts`. Append:

```typescript
import { useEffect, useState } from "react";

export function useAiKey(): boolean {
  const [present, setPresent] = useState(false);
  useEffect(() => {
    setPresent(hasAiKey());
    function refresh() {
      setPresent(hasAiKey());
    }
    window.addEventListener("storage", refresh);
    window.addEventListener("jobcopilot.ai-key-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("jobcopilot.ai-key-changed", refresh);
    };
  }, []);
  return present;
}
```

(Hook lives next to the helpers because they share the same storage-event watcher pattern. The existing imports `"use client"` directive at the top of the file means React is available.)

- [ ] **Step 2: Wire `useAiKey` + `aiHeaders` into `cover-letter-drafter.tsx`**

At the top of the component:

```tsx
import { useAiKey, aiHeaders } from "@/lib/ai-client";
// ...
const keyPresent = useAiKey();
```

For every `fetch("/api/...")` call inside the component, merge `aiHeaders()`:

```tsx
await fetch("/api/applications/.../draft-cover-letter", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...aiHeaders() },
  body: JSON.stringify({...}),
});
```

For every AI-triggering button (`<Button onClick={generate}>` etc.), add `disabled={!keyPresent || ...existing disabled conditions...}` and a tooltip-style hint when disabled:

```tsx
<Button
  onClick={generate}
  disabled={!keyPresent || isGenerating}
  title={!keyPresent ? "Set up an API key in Settings" : undefined}
>
```

- [ ] **Step 3: Same wiring for `bullet-suggester.tsx`**

Repeat the pattern.

- [ ] **Step 4: Same wiring for `add-application-dialog.tsx`**

The "extract from URL" submission button is the AI-triggering one.

- [ ] **Step 5: Same wiring for resume upload on `profile/page.tsx`**

The resume PDF upload form's submit button.

- [ ] **Step 6: Typecheck**

```bash
pnpm -F @jobcopilot/web typecheck
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/ai-client.ts apps/web/src/components/cover-letter-drafter.tsx apps/web/src/components/bullet-suggester.tsx apps/web/src/components/add-application-dialog.tsx "apps/web/src/app/(app)/profile/page.tsx"
git commit -m "feat(web): disable ai buttons and inject key headers when no key"
```

---

## Task 11: Middleware log-redaction guard

**Files:**
- Modify: `apps/web/src/middleware.ts`

Defense-in-depth: even though Next.js doesn't auto-log request headers, a future Sentry/observability integration might. This guard drops the sensitive headers from the in-memory request object that downstream code can inspect.

- [ ] **Step 1: Update middleware**

Replace `apps/web/src/middleware.ts` with:

```typescript
import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

const SENSITIVE_HEADER_NAMES = ["x-ai-key", "authorization"];

/**
 * Defense-in-depth: nothing in the current pipeline reads headers for logs,
 * but if Sentry/Vercel/observability middleware ever does, this comment is the
 * note that x-ai-key and Authorization MUST be redacted before shipping logs.
 *
 * If you add a Sentry init or any structured logger that captures req.headers,
 * use the above list as your scrub list.
 */
void SENSITIVE_HEADER_NAMES;

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
```

(This task is intentionally light — there is no observability code in the project today. The export of `SENSITIVE_HEADER_NAMES` makes it discoverable for future Sentry/datadog integration.)

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "feat(web): note sensitive headers for future log redaction"
```

---

## Task 12: Remove env var fallback and delete `lib/claude.ts`

**Files:**
- Delete: `apps/web/src/lib/claude.ts`
- Modify: root `.env`, `apps/web/.env.local` (remove `ANTHROPIC_API_KEY=` line)

- [ ] **Step 1: Confirm no remaining imports of `claude.ts`**

```bash
pnpm -F @jobcopilot/web exec grep -rn "from \"@/lib/claude\"\\|from '@/lib/claude'" src/ tests/
```
Expected: no matches (Tasks 6-9 removed all imports).

If any matches exist, fix them before proceeding.

- [ ] **Step 2: Delete `lib/claude.ts`**

```bash
rm apps/web/src/lib/claude.ts
```

- [ ] **Step 3: Remove `ANTHROPIC_API_KEY` from env files**

Open `apps/web/.env.local` and root `.env`. Delete the `ANTHROPIC_API_KEY=...` line in each. Save.

(If you've also got `ANTHROPIC_API_KEY` set in your Vercel project settings or any deploy CI config, remove it there too as part of the next deploy.)

- [ ] **Step 4: Remove `@anthropic-ai/sdk` if no longer imported**

```bash
pnpm -F @jobcopilot/web exec grep -rn "@anthropic-ai/sdk" src/ tests/
```

If no matches, drop the dep:
```bash
pnpm -F @jobcopilot/web remove @anthropic-ai/sdk
```

If matches exist (e.g. `packages/prompts/*` still types its return shape with Anthropic types), leave the dep. Phase 2b will rip it out fully.

- [ ] **Step 5: Typecheck and run all tests**

```bash
pnpm -F @jobcopilot/web typecheck
pnpm -F @jobcopilot/web test
```
Expected: PASS, all green.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/claude.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): remove claude.ts and ANTHROPIC_API_KEY env fallback"
```

(`.env` files are gitignored — confirm `git status` does not list them. If it does, your `.gitignore` is wrong and must be fixed before this commit.)

---

## Task 13: Final smoke test + ship

**Files:** none

This is a manual verification gate. Phase 2a is shipped only after all checks pass.

- [ ] **Step 1: Start dev server**

```bash
pnpm -F @jobcopilot/web dev
```

- [ ] **Step 2: Smoke matrix (in browser at localhost:3000, signed in)**

Run each row, verifying the expected behavior:

| Action | Expected |
|---|---|
| Clear localStorage, reload `/dashboard` | Amber banner shows on every page |
| All AI buttons (Suggest bullets, Draft cover letter, Extract URL, Upload resume) | Disabled with "Set up API key" tooltip |
| Visit `/settings`, paste a real Anthropic key, click Test & save | Green "Saved." appears, banner clears, AI buttons enable |
| Hit `/api/applications/extract` (via Add Application dialog) with no headers (manually via curl) | 402 with `"no api key"` body |
| Hit `/api/applications/extract` 31 times in <5min from same IP | 31st returns 429 with `Retry-After` header |
| Run all four AI features end-to-end with the key | Each returns successfully, no 500s |
| Open DevTools Network tab on AI request | Confirm `x-ai-key` header is sent on the request, not visible in any response |
| Click "Clear all keys" in `/settings` | Banner reappears, AI buttons re-disable |

- [ ] **Step 3: Update Phase 1 plan + memory**

Mark Phase 2a shipped in the project memory. From the goneidle workspace:

```bash
# Edit memory file
notepad C:/Users/ethan/.claude/projects/C--Users-ethan-Desktop-goneidle/memory/10_project_jobcopilot_phase1.md
```
Add a line under STATUS noting "Phase 2a (BYO Anthropic only) shipped at <commit hash>." If the project status memory is now superseded, rename to `10_project_jobcopilot_byo.md` or similar.

- [ ] **Step 4: Final commit**

If any docs/memory changes were made:

```bash
git add docs/
git commit -m "docs: phase 2a shipped"
```

---

## Definition of done

Phase 2a ships when:

1. All 13 tasks above have green checkmarks.
2. Manual smoke matrix in Task 13 Step 2 passes every row.
3. `pnpm -F @jobcopilot/web typecheck` and `pnpm -F @jobcopilot/web test` both pass clean.
4. No `ANTHROPIC_API_KEY` in any env file, deploy config, or grep'able code.
5. The next deploy goes out and Ethan, on his own browser, can paste his Anthropic key in `/settings` and use all four AI features.

Phase 2b (multi-provider via Vercel AI SDK refactor of `packages/prompts/*`) and Phase 2c (free-tier durability) are separate plans, written when 2a is done.
