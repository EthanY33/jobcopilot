// @vitest-environment node
import Anthropic from "@anthropic-ai/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = "11111111-1111-4111-8111-111111111111";
const APP_ID = "22222222-2222-4222-8222-222222222222";
const VARIANT_ID = "44444444-4444-4444-8444-444444444444";
const DRAFT_ID = "55555555-5555-4555-8555-555555555555";

const auth = vi.hoisted(() => ({ getUser: vi.fn() }));
const create = vi.hoisted(() => vi.fn());
const getClaude = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({
  application: { findFirst: vi.fn(), update: vi.fn() },
  resumeVariant: { findFirst: vi.fn(), create: vi.fn() },
  draftedContent: { findFirst: vi.fn(), aggregate: vi.fn(), create: vi.fn() },
  profile: { findUnique: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({ auth }),
}));
vi.mock("@jobcopilot/db", () => ({
  prisma: db,
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
}));
vi.mock("@/lib/claude", () => ({ getClaude }));

import { POST as postDraft } from "@/app/api/applications/[id]/draft-cover-letter/route";
import { POST as postBullets } from "@/app/api/applications/[id]/suggest-bullets/route";

const ctx = (id: string) => ({ params: { id } });

function json(body: unknown): Request {
  return new Request("http://localhost:3000/api/applications/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// What the Anthropic SDK throws for a non-2xx reply: the message is the status
// followed by the provider's JSON error body.
function apiError(status: number, type: string, message: string): Error {
  return Anthropic.APIError.generate(
    status,
    { type: "error", error: { type, message }, request_id: "req_011CSecret" },
    undefined,
    new Headers(),
  );
}

function reply(text: string, stopReason = "end_turn") {
  return { content: [{ type: "text", text }], stop_reason: stopReason };
}

const COVER_LETTER = JSON.stringify({ body: "Dear team", alternateOpenings: ["a", "b", "c"] });
const SUGGESTIONS = JSON.stringify({
  suggestions: [
    { section: "Experience", originalBullet: "Built X", suggestedBullet: "Shipped X", rationale: "r" },
  ],
});

function seedDraftingRows(): void {
  db.application.findFirst.mockResolvedValue({
    id: APP_ID,
    jobPosting: { company: "Acme", title: "Engineer", description: "Build things", requirements: ["TS"] },
  });
  db.resumeVariant.findFirst.mockResolvedValue({
    id: VARIANT_ID,
    emphasisKeywords: ["typescript"],
    bullets: [{ section: "Experience", items: ["Built X"] }],
  });
  db.profile.findUnique.mockResolvedValue({
    baseResumeText: "Resume text",
    skills: ["TypeScript"],
    targetRoles: ["Software Engineer"],
  });
  db.draftedContent.aggregate.mockResolvedValue({ _max: { version: null } });
  db.draftedContent.create.mockResolvedValue({ id: DRAFT_ID, version: 1 });
  db.application.update.mockResolvedValue({ id: APP_ID });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  auth.getUser.mockResolvedValue({ data: { user: { id: USER } } });
  getClaude.mockReturnValue({ messages: { create } });
  seedDraftingRows();
});

const routes = [
  { name: "draft-cover-letter", post: postDraft, good: COVER_LETTER },
  { name: "suggest-bullets", post: postBullets, good: SUGGESTIONS },
] as const;

describe.each(routes)("jobcopilot-09: $name never returns upstream error text", ({ post, good }) => {
  const request = () => post(json({ resumeVariantId: VARIANT_ID }), ctx(APP_ID));

  it("returns the fixed 502 code when the provider reports a credit problem", async () => {
    create.mockRejectedValue(
      apiError(400, "invalid_request_error", "Your credit balance is too low to access the Anthropic API."),
    );
    const res = await request();
    const text = await res.text();
    expect(res.status).toBe(502);
    expect(JSON.parse(text)).toEqual({ error: "claude_request_failed", retryable: true });
    expect(text).not.toContain("credit balance");
    expect(text).not.toContain("req_011CSecret");
  });

  it("does not report a provider auth failure as a parse error", async () => {
    create.mockRejectedValue(apiError(401, "authentication_error", "Invalid API key"));
    const res = await request();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "claude_request_failed", retryable: true });
  });

  it("returns the fixed 502 code for a network failure", async () => {
    create.mockRejectedValue(new Anthropic.APIConnectionError({ message: "Expected a socket, got ECONNRESET" }));
    const res = await request();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "claude_request_failed", retryable: true });
  });

  it("returns the fixed 422 code when the reply is not JSON", async () => {
    create.mockResolvedValue(reply("I cannot help with that request."));
    const res = await request();
    const text = await res.text();
    expect(res.status).toBe(422);
    expect(JSON.parse(text)).toEqual({ error: "parse_failed", retryable: false });
    expect(text).not.toContain("JSON object");
  });

  it("returns the fixed 422 code when the reply has the wrong shape", async () => {
    create.mockResolvedValue(reply('{"unexpected":true}'));
    const res = await request();
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "parse_failed", retryable: false });
  });

  it("still returns the draft when the reply parses", async () => {
    create.mockResolvedValue(reply(good));
    const res = await request();
    expect(res.status).toBe(200);
    expect((await res.json()).draftId).toBe(DRAFT_ID);
    expect(db.draftedContent.create).toHaveBeenCalledTimes(1);
  });
});

describe("jobcopilot-20: truncated replies and oversized bullet lists", () => {
  it.each(routes)("$name reports a reply cut off at max_tokens as parse_failed", async ({ post, good }) => {
    create.mockResolvedValue(reply(good.slice(0, good.length - 5), "max_tokens"));
    const res = await post(json({ resumeVariantId: VARIANT_ID }), ctx(APP_ID));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "parse_failed", retryable: false });
    expect(db.draftedContent.create).not.toHaveBeenCalled();
  });

  it("suggest-bullets refuses a variant with more bullets than one reply can hold", async () => {
    db.resumeVariant.findFirst.mockResolvedValue({
      id: VARIANT_ID,
      emphasisKeywords: [],
      bullets: [
        { section: "Experience", items: Array.from({ length: 30 }, (_, i) => `Bullet ${i}`) },
        { section: "Projects", items: Array.from({ length: 21 }, (_, i) => `Bullet ${i}`) },
      ],
    });
    const res = await postBullets(json({ resumeVariantId: VARIANT_ID }), ctx(APP_ID));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "too_many_bullets", max: 50 });
    expect(getClaude).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("suggest-bullets accepts a variant at the bullet limit", async () => {
    db.resumeVariant.findFirst.mockResolvedValue({
      id: VARIANT_ID,
      emphasisKeywords: [],
      bullets: [{ section: "Experience", items: Array.from({ length: 50 }, (_, i) => `Bullet ${i}`) }],
    });
    create.mockResolvedValue(reply(SUGGESTIONS));
    const res = await postBullets(json({ resumeVariantId: VARIANT_ID }), ctx(APP_ID));
    expect(res.status).toBe(200);
    const sent = create.mock.calls[0]?.[0] as { max_tokens: number };
    expect(sent.max_tokens).toBeGreaterThanOrEqual(50 * 200);
  });
});
