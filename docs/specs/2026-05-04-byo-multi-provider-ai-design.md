# BYO Multi-Provider AI — Design Spec

**Date:** 2026-05-04
**Status:** Draft (brainstormed, pending review)
**Owner:** Ethan Yucetepe
**Phase boundary:** Ships after Phase 1 Tasks 16-17. This is Phase 2's first milestone, split into 2a / 2b / 2c (see §3).
**Source:** Phase 1 plan at `docs/plans/2026-04-14-job-hunt-copilot-phase1.md`.

---

## 1. Why

Phase 1 ships with a single shared `ANTHROPIC_API_KEY` server-side env var. That works for solo dogfood (Ethan applies for the Google YouTube referral) but is unviable for any public version: Ethan would pay every user's Claude bill.

This spec replaces the env-var pattern with **per-user BYO keys** for Anthropic / OpenAI / Google. Users paste their own keys in a Settings page; keys live only in browser localStorage and are sent over HTTPS as `x-ai-key` headers on each API call. The route handler uses the key for one upstream call and never logs or persists it.

**$0-to-Ethan goal:** post-cutover, Ethan switches to his own free Gemini key like any other user. JobCopilot's marginal AI cost goes to zero.

## 2. Non-goals (out of scope for this milestone)

Explicit punt list — these are deferred to later spec docs:

- Local LLM (Ollama) support
- Groq / xAI / Mistral / DeepSeek providers
- Per-feature provider override ("use Claude for cover letters, Gemini for parsing")
- Chrome-extension port of the BYO settings layer
- Server-side encrypted-at-rest key sync across devices
- Free-credit marketplace / shared-key allowance for trial users
- Trial mode where Ethan's key serves the first N calls per new user

## 3. Scope split

This work ships in three sub-milestones, gated by ship criteria. No timeboxes.

### Phase 2a — BYO Anthropic only (no AI-SDK rewrite)

- `/settings` page accepts one Anthropic key, validates via 1-token verify call
- Existing route handlers read key from request header instead of env var
- Env-var fallback **removed entirely**
- Per-IP rate limit on AI endpoints (Vercel KV free tier)
- Cutover banner + AI-button blocking when no key is set
- Log-redaction middleware for `x-ai-key` and `authorization` headers
- **Ship criterion:** Ethan can use JobCopilot end-to-end with a key pasted in Settings; no env vars. No regression on Phase 1 features.

### Phase 2b — Multi-provider via Vercel AI SDK

- Add OpenAI + Google adapters
- Settings page extended: 3 keys + global default `{ provider, model }`
- `packages/prompts/*` refactored to use `generateObject` with Zod schema enforcement (replaces ad-hoc raw-text JSON parsing)
- Per-provider PDF-parsing strategy (see §8)
- Curated model dropdown per provider (see §7.2)
- **Ship criterion:** All four AI features (resume parse, posting extract, cover letter, bullet suggester) work end-to-end with each of Anthropic / OpenAI / Google keys.

### Phase 2c — Free-tier durability

- Pick one: (a) GitHub Actions cron heartbeat hits Supabase REST hourly to defeat idle-deletion, OR (b) migrate Postgres data to Neon (free tier, no idle deletion); Supabase stays for auth only
- Recommended: **(a)** for v1 — zero migration risk, zero migration work, $0
- **Ship criterion:** Project survives 2+ consecutive weeks of idle without manual intervention.

## 4. Architecture

### 4.1 Key custody model — hybrid

```
[Browser localStorage]
  └─ providers: { anthropic: "...", openai: "...", google: "..." }
  └─ default:   { provider: "anthropic", model: "claude-sonnet-4-6" }
        │
        │ (per request)
        ▼
[Browser fetch]  --HTTPS-->  [Next.js route handler]
  headers:                     - reads x-ai-provider, x-ai-key
    x-ai-provider              - calls AI SDK with key in-memory
    x-ai-key                   - never logs, never persists
                               - returns result
```

Keys are **never written to your DB or to logs.** They transit your server in-memory only for the duration of one request.

### 4.2 Component changes

**Created:**

1. `apps/web/src/lib/ai.ts` — central call dispatcher; thin Vercel AI SDK wrapper. Replaces `lib/claude.ts`.
2. `apps/web/src/lib/ai-client.ts` — browser helper: reads localStorage, returns headers to merge into fetch calls.
3. `apps/web/src/app/(app)/settings/page.tsx` — key entry, default selection, "Test" button, "Clear all keys" button, security copy.
4. `apps/web/src/app/api/ai/verify/route.ts` — POST endpoint that does a 1-token round-trip to validate a pasted key.
5. `apps/web/src/middleware.ts` (modified) — explicit log-redaction for `x-ai-key` + `authorization` headers (defense in depth against Sentry/Vercel logs).
6. `apps/web/src/lib/rate-limit.ts` — Vercel KV-backed per-IP token bucket.

**Refactored:**

7. `apps/web/src/app/api/profile/parse-resume/route.ts` — read key from header; call `lib/ai.ts`.
8. `apps/web/src/app/api/postings/extract/route.ts` — same.
9. `apps/web/src/app/api/applications/[id]/draft-cover-letter/route.ts` — same.
10. `apps/web/src/app/api/applications/[id]/suggest-bullets/route.ts` — same.
11. `packages/prompts/src/*.ts` — convert from raw-text Claude calls to `generateObject` with Zod schemas (Phase 2b only).

**Deleted:**

12. `apps/web/src/lib/claude.ts` — fully replaced by `lib/ai.ts`.
13. `ANTHROPIC_API_KEY` env var — removed from `.env`, `apps/web/.env.local`, deploy config.

### 4.3 `lib/ai.ts` surface

```typescript
type Provider = "anthropic" | "openai" | "google";
type Key = { provider: Provider; key: string; model: string };

// Phase 2a: only Anthropic adapter implemented; throws on others
// Phase 2b: full adapter set
export async function generate(opts: {
  key: Key;
  messages: CoreMessage[];
  schema?: z.ZodType;       // when present, uses generateObject; else generateText
  system?: string;
  files?: Array<{ data: Uint8Array; mimeType: string }>;
}): Promise<{ text?: string; object?: unknown; usage: Usage }>;

export function readKeyFromHeaders(req: Request): Key;
// throws ApiKeyMissingError → handler maps to 402 with /settings hint
```

## 5. Data flow

### 5.1 Onboarding (first-time user, no keys)

1. User signs up, lands on dashboard.
2. Dashboard detects no localStorage AI key → renders banner: "Set up an API key in Settings to use AI features." All AI buttons (Suggest bullets, Draft cover letter, etc.) are disabled with the same hint.
3. User clicks → `/settings`.
4. Pastes Anthropic key (Phase 2a) or any of three keys (Phase 2b).
5. Clicks "Test" per key → `POST /api/ai/verify` with `x-ai-provider`, `x-ai-key` headers → 200 OK on success, 4xx with provider message on failure.
6. On success: write keys + default to localStorage; banner clears; AI buttons enabled.

### 5.2 Feature use

1. User clicks "Draft cover letter" on application detail page.
2. Browser reads localStorage via `lib/ai-client.ts` → injects `x-ai-provider`, `x-ai-key` headers into fetch.
3. Route handler:
   - Auth check (Supabase session)
   - Rate-limit check (per-IP, Vercel KV)
   - `readKeyFromHeaders(req)` → 402 if missing
   - Calls `lib/ai.ts:generate(...)` with key
   - Returns result
4. No DB write of the key occurs at any step.

## 6. Security model

### 6.1 Threats addressed

- **Custody breach:** keys are never persisted server-side, so a DB or backup leak does not leak keys.
- **Log leak:** explicit redaction middleware strips `x-ai-key`, `authorization` from any header dict before logging or error reporting (Sentry, Vercel logs, console.error).
- **Cross-user pollution:** per-request key extraction; no shared in-memory state.

### 6.2 Threats accepted (documented for users)

- **XSS on jobcopilot.com:** any same-origin script can read localStorage. Standard for any web app holding tokens. Mitigation: Next.js sends no CSP by default. Today only a frame-ancestors-only CSP plus nosniff, Referrer-Policy, X-Frame-Options and Permissions-Policy are set (apps/web/next.config.mjs); a script-src CSP needs per-request nonces and is not yet enforced, so add it in Phase 2a.
- **Browser extension reads localStorage:** any user-installed extension with broad permissions can read localStorage. Out of scope to mitigate.
- **TLS-trust-in-Ethan's-server:** users have to trust the server doesn't log. Mitigation: settings-page security copy explicitly states this; route-handler code is open source for audit.

### 6.3 Settings page security copy (required, verbatim)

> **Your keys stay in your browser.**
> JobCopilot stores API keys only in your browser's localStorage — never on our servers. Each AI request sends your key over HTTPS to our server, which forwards it to the provider you've selected. We do not log or store your keys.
>
> **Keys are per-device.** Sign in on a new browser? You'll need to re-enter your keys.
>
> **Clear all keys** at any time using the button below.

### 6.4 Rate limiting (Phase 2a)

Per-IP token bucket on AI route handlers, backed by Vercel KV (free tier: 256MB, 30k commands/day):

- Burst bucket: 30 tokens, refills 1 token every 10 seconds (steady state ~6/min)
- Daily ceiling: 200 requests / IP / rolling 24h
- 429 with `Retry-After` header when exceeded

This protects **Ethan's Vercel function-invocation costs**, not the user's API budget.

## 7. Settings page UX

### 7.1 Phase 2a layout

```
Settings
─────────────
API Keys

Anthropic
[ ____________________________________ ]  [Test]
Get a key at console.anthropic.com

[Clear all keys]

(security copy from §6.3)
```

### 7.2 Phase 2b layout

```
Settings
─────────────
API Keys

Anthropic  [____________] [Test] ✓ verified
OpenAI     [____________] [Test] ✓ verified
Google     [____________] [Test] (not set)

Default provider: [Anthropic ▾]
Default model:    [Claude Sonnet 4.6 ▾]

[Clear all keys]

(security copy from §6.3)
```

Test calls `/api/ai/verify` with `x-ai-provider` + `x-ai-key`. Cost: ~$0.0001 per verify (1-token completion). Inline note on the page: "Test makes a 1-token completion call. Costs about $0.0001 from your provider."

### 7.3 Curated model dropdown

| Provider | Cheap-fast | Default | Best quality |
|----------|------------|---------|--------------|
| Anthropic | claude-haiku-4-5 | claude-sonnet-4-6 | claude-opus-4-7 |
| OpenAI | gpt-4o-mini | gpt-4o | gpt-4o |
| Google | gemini-1.5-flash | gemini-1.5-pro | gemini-1.5-pro |

No free-text model entry. Avoids users picking stale model IDs from training data.

## 8. Provider adapters

### 8.1 Common surface (Vercel AI SDK)

All three providers go through `ai` SDK 4.x:

- `generateText` for raw-text prompts
- `generateObject` with Zod schema for structured output (the recommended path for almost all of our prompts — see §9)

### 8.2 Anthropic

- SDK: `@ai-sdk/anthropic`
- Models: `claude-haiku-4-5`, `claude-sonnet-4-6` (default), `claude-opus-4-7`
- PDF: native via attachments with `mimeType: "application/pdf"`
- Prompt caching: **dropped from v1** (low hit rate per individual user with their own key). Revisit if Anthropic users complain.

### 8.3 OpenAI

- SDK: `@ai-sdk/openai`
- Models: `gpt-4o-mini` (cheap), `gpt-4o` (default + best)
- PDF: OpenAI's PDF support requires the Files API (upload-then-reference) and is awkward through the AI SDK. **Phase 2b scope cut: disable resume-PDF parsing on OpenAI.** Settings UI shows: "OpenAI does not support PDF resume parsing — switch to Anthropic or Google for that feature." All other features (cover letter, bullet suggester, posting extract) work unchanged.

### 8.4 Google

- SDK: `@ai-sdk/google`
- Models: `gemini-1.5-flash` (cheap, generous free tier), `gemini-1.5-pro` (default + best)
- PDF: native via `inlineData` with `application/pdf`. Best free-tier option for Ethan's own dogfood post-cutover.

## 9. Prompt portability

### 9.1 The problem

Existing prompts in `packages/prompts/src/` are tuned for Claude:

- Raw-text outputs with JSON-fenced blocks
- "Respond with only the JSON, no preamble"
- Manual `JSON.parse` after stripping fences in the consumer

GPT-4o wraps JSON in markdown fences regardless of instructions; Gemini sometimes adds preamble. Naive port = regressions.

### 9.2 The fix: `generateObject` with Zod

Vercel AI SDK exposes `generateObject({ schema, ... })` which:

- Anthropic: tool-use round-trip, returns parsed object
- OpenAI: JSON mode + function calling
- Google: `response_mime_type=application/json` + responseSchema

All three return a parsed object matching the Zod schema. No fence-stripping, no preamble issues. SDK retries once on schema-violation in `mode: "auto"`.

### 9.3 Refactor scope (Phase 2b)

Each prompt builder in `packages/prompts/src/` returns:

- `resume-parse.ts` → `{ schema: ResumeParseSchema, system, messages, files }`
- `resume-bullets.ts` → `{ schema: BulletsSchema, system, messages }`
- `cover-letter.ts` → `{ schema: CoverLetterSchema, system, messages }`
- `posting-extract.ts` → `{ schema: PostingSchema, system, messages }`

Consumers (route handlers) stop calling `JSON.parse` and just use the typed `object` from `generateObject`'s result.

## 10. Migration / cutover UX

The Phase 2a deploy is a **breaking change** for existing users: env-var Anthropic key is gone, every request requires a localStorage key.

Cutover handling:

- On any authenticated app-shell render post-deploy, the shell checks `localStorage.aiKeys` → empty → renders a top-bar banner: "JobCopilot now uses your own AI key — set one up in Settings to use AI features." Banner has a "Go to Settings" button. Banner persists across route changes until at least one key is set.
- All AI-triggering buttons (cover-letter-drafter, bullet-suggester, posting-extract dialog, resume-upload form) check the same flag → disabled state with tooltip "Set up an API key in Settings."
- No silent failures. The 402 response from AI endpoints is reachable but never the user's first signal — disabled buttons are.

## 11. Testing strategy

### 11.1 Unit tests

- `lib/ai.ts` adapter tests: mock the AI SDK, verify each provider branch is called with correct `apiKey` arg. 1 test in 2a, 3 tests in 2b.
- `lib/rate-limit.ts`: mock Vercel KV, verify token-bucket math. ~5 tests.
- `lib/ai-client.ts`: jsdom + localStorage mock, verify header injection. ~3 tests.

### 11.2 Integration tests (existing pattern)

Each refactored route handler: existing tests pass after replacing the Claude mock with the `lib/ai.ts` mock. No new test files.

### 11.3 E2E

**Skipped.** Real provider API calls are too expensive on every PR. Manual key-paste verification at each ship-criterion gate.

### 11.4 Manual verification per phase

- **2a ship:** paste Anthropic key, run all four AI features, confirm no 500s, confirm AI buttons disabled with no key, confirm rate-limit triggers at 30/5min.
- **2b ship:** same matrix × 3 providers (Anthropic, OpenAI, Google), excluding the documented OpenAI-resume-parse carve-out (§8.3) — net 11 of 12 feature×provider cells.
- **2c ship:** leave the Supabase project untouched for 2+ weeks, verify it stays healthy.

## 12. Open questions

1. **Phase 2c choice:** cron heartbeat (a) vs Neon migration (b)? Recommendation is (a) for v1; revisit if free-tier limits hurt later.
2. **Resume re-parse on provider switch:** if a user's Base variant was parsed with Claude, then they switch to Gemini-only, does the existing variant data still work? Yes — it's stored JSON. The next re-parse uses Gemini and may produce slightly different sectioning. Documented behavior, not a bug.
3. **Anthropic OAuth flow:** Anthropic recently added OAuth (no raw API key). Should the settings page support it? **Defer** — adds OAuth callback handling that doesn't fit the "key in localStorage" model.

## 13. Reuses for future work

The `lib/ai.ts` + `lib/ai-client.ts` + Settings page maps almost 1:1 to a Manifest V3 Chrome extension service worker. If/when JobCopilot ships a Chrome extension (separate spec), this milestone's code carries over directly — the extension's background worker becomes another caller of the same `lib/ai.ts` adapter, reading from the extension's `chrome.storage.local` instead of `localStorage`.
