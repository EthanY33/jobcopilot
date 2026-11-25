import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  scrape: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  appFindUnique: vi.fn(),
  claudeCreate: vi.fn(),
  parse: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/scraper", () => ({ scrape: mocks.scrape }));
vi.mock("@/lib/claude", () => ({ getClaude: () => ({ messages: { create: mocks.claudeCreate } }) }));
vi.mock("@jobcopilot/prompts", () => ({
  buildJobExtractionRequest: (x: unknown) => x,
  parseJobExtractionResponse: mocks.parse,
}));
vi.mock("@jobcopilot/db", () => ({
  prisma: {
    jobPosting: { findUnique: mocks.findUnique, create: mocks.create, update: mocks.update },
    application: { upsert: mocks.upsert, findUnique: mocks.appFindUnique },
  },
}));

import { POST } from "./route";

const URL_IN = "https://boards.greenhouse.io/acme/jobs/1";
const DAY = 24 * 3600 * 1000;
const extracted = {
  company: "Acme",
  title: "Engineer",
  location: null,
  requirements: ["ts"],
  description: "fresh description",
  sourceAts: "greenhouse",
};

function req() {
  return new Request("http://localhost/api/postings/extract", {
    method: "POST",
    body: JSON.stringify({ url: URL_IN }),
  });
}

function row(over: Record<string, unknown> = {}) {
  return {
    id: "p1",
    sourceUrl: URL_IN,
    sourceAts: "greenhouse",
    company: "Old",
    title: "Old title",
    location: null,
    requirements: [],
    description: "cached description",
    discoveredAt: new Date(),
    ...over,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  mocks.scrape.mockResolvedValue({ html: "<p>x</p>", text: "x", detectedAts: "greenhouse" });
  mocks.claudeCreate.mockResolvedValue({});
  mocks.parse.mockReturnValue(extracted);
  mocks.upsert.mockResolvedValue({ id: "a1" });
});

describe("POST /api/postings/extract", () => {
  it("reuses a fresh cached posting without scraping", async () => {
    mocks.findUnique.mockResolvedValue(row());
    const res = await POST(req());
    const json = await res.json();
    expect(mocks.scrape).not.toHaveBeenCalled();
    expect(json.extracted.description).toBe("cached description");
  });

  it("re-extracts and updates a stale cached posting", async () => {
    const old = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    mocks.findUnique.mockResolvedValue(row({ discoveredAt: old }));
    mocks.update.mockResolvedValue(row({ ...extracted }));
    const res = await POST(req());
    const json = await res.json();
    expect(mocks.scrape).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(json.extracted.description).toBe("fresh description");
  });

  it("falls back to the stale row when re-scraping fails", async () => {
    const old = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    mocks.findUnique.mockResolvedValue(row({ discoveredAt: old }));
    mocks.scrape.mockRejectedValue(new Error("boom"));
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect((await res.json()).extracted.description).toBe("cached description");
  });

  it("recovers from a duplicate-URL race on create (P2002)", async () => {
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(row({ id: "winner" }));
    mocks.create.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect((await res.json()).jobPostingId).toBe("winner");
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });

  it("returns a JSON 500 when create fails for another reason", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockRejectedValue(new Error("22021 invalid byte sequence"));
    const res = await POST(req());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("posting_save_failed");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("strips NUL bytes from the stored raw html", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.scrape.mockResolvedValue({ html: "a\u0000b", text: "ab", detectedAts: "greenhouse" });
    mocks.create.mockResolvedValue(row({ id: "new" }));
    await POST(req());
    expect(mocks.create.mock.calls[0][0].data.rawHtml).toBe("ab");
  });

  // ---- tests the review asks for ----

  it("does not trust a cached row dated in the future", async () => {
    mocks.findUnique.mockResolvedValue(row({ discoveredAt: new Date(Date.now() + 365 * DAY) }));
    mocks.update.mockResolvedValue(row({ ...extracted }));
    const res = await POST(req());
    expect(mocks.scrape).toHaveBeenCalledTimes(1);
    expect((await res.json()).extracted.description).toBe("fresh description");
  });

  it("re-extracts a fresh cached row that has no description and no requirements", async () => {
    mocks.findUnique.mockResolvedValue(row({ description: "", requirements: [] }));
    mocks.update.mockResolvedValue(row({ ...extracted }));
    const res = await POST(req());
    expect(mocks.scrape).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect((await res.json()).extracted.description).toBe("fresh description");
  });

  it("keeps a good stale row when the refresh comes back empty", async () => {
    mocks.findUnique.mockResolvedValue(row({ discoveredAt: new Date(Date.now() - 30 * DAY) }));
    mocks.parse.mockReturnValue({ ...extracted, description: " ", requirements: [] });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(mocks.scrape).toHaveBeenCalledTimes(1);
    expect(mocks.update).not.toHaveBeenCalled();
    expect((await res.json()).extracted.description).toBe("cached description");
  });

  it("falls back to the stale row when the update fails", async () => {
    mocks.findUnique.mockResolvedValue(row({ discoveredAt: new Date(Date.now() - 30 * DAY) }));
    mocks.update.mockRejectedValue(new Error("db hiccup"));
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect((await res.json()).extracted.description).toBe("cached description");
  });

  it("returns a JSON 500 when saving the application fails", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue(row({ id: "new" }));
    mocks.upsert.mockRejectedValue(new Error("connection lost"));
    const res = await POST(req());
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("application_save_failed");
  });

  it("recovers when a concurrent request created the application first (P2002)", async () => {
    mocks.findUnique.mockResolvedValue(row());
    mocks.upsert.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    mocks.appFindUnique.mockResolvedValue({ id: "a-winner" });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect((await res.json()).applicationId).toBe("a-winner");
  });

  it("rejects a PDF body without calling Claude", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const pdf = "%PDF-1.7\n" + "\u0000\u0001�".repeat(200);
    mocks.scrape.mockResolvedValue({ html: pdf, text: pdf, detectedAts: "manual" });
    const res = await POST(req());
    expect(res.status).toBe(415);
    expect((await res.json()).error).toBe("unsupported_content");
    expect(mocks.claudeCreate).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects binary noise that has no PDF header", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const noise = "PK\u0003\u0004" + "�\u0000a".repeat(500);
    mocks.scrape.mockResolvedValue({ html: noise, text: noise, detectedAts: "manual" });
    const res = await POST(req());
    expect(res.status).toBe(415);
    expect(mocks.claudeCreate).not.toHaveBeenCalled();
  });

  it("still accepts a text page with one stray NUL byte", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const html = "<html><body>" + "A real job description. ".repeat(50) + "\u0000</body></html>";
    mocks.scrape.mockResolvedValue({ html, text: html, detectedAts: "greenhouse" });
    mocks.create.mockResolvedValue(row({ id: "new" }));
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(mocks.claudeCreate).toHaveBeenCalledTimes(1);
  });

  it("strips NUL bytes from every extracted field", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.parse.mockReturnValue({
      company: "A\u0000cme",
      title: "En\u0000g",
      location: "N\u0000Y",
      requirements: ["t\u0000s"],
      description: "d\u0000esc",
      sourceAts: "greenhouse",
    });
    mocks.create.mockResolvedValue(row({ id: "new" }));
    const res = await POST(req());
    const stored = mocks.create.mock.calls[0][0].data;
    expect(Object.values(stored).flat().join("")).not.toContain("\u0000");
    expect(JSON.stringify((await res.json()).extracted)).not.toContain("\\u0000");
  });
});
