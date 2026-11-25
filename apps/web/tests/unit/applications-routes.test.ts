// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = "11111111-1111-4111-8111-111111111111";
const APP_ID = "22222222-2222-4222-8222-222222222222";
const FOREIGN_VARIANT = "33333333-3333-4333-8333-333333333333";
const OWN_VARIANT = "44444444-4444-4444-8444-444444444444";

const auth = vi.hoisted(() => ({ getUser: vi.fn() }));
const getClaude = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({
  application: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  resumeVariant: { findFirst: vi.fn(), findMany: vi.fn() },
  draftedContent: {
    findFirst: vi.fn(),
    update: vi.fn(),
    aggregate: vi.fn(),
    create: vi.fn(),
  },
  profile: { findUnique: vi.fn() },
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({ auth }),
}));
vi.mock("@jobcopilot/db", () => ({ prisma: db, Prisma: {} }));
vi.mock("@/lib/claude", () => ({ getClaude }));

import { GET as getOne, PATCH } from "@/app/api/applications/[id]/route";
import { GET as getList } from "@/app/api/applications/route";
import { PUT as putContacts } from "@/app/api/applications/[id]/contacts/route";
import {
  PATCH as patchDraft,
  POST as postDraft,
} from "@/app/api/applications/[id]/draft-cover-letter/route";
import { POST as postBullets } from "@/app/api/applications/[id]/suggest-bullets/route";

const DRAFT_ID = "55555555-5555-4555-8555-555555555555";

const ctx = (id: string) => ({ params: { id } });

function json(method: string, body: unknown): Request {
  return new Request("http://localhost:3000/api/applications/x", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function prismaError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

beforeEach(() => {
  vi.resetAllMocks();
  auth.getUser.mockResolvedValue({ data: { user: { id: USER } } });
});

describe("jobcopilot-05: PATCH resumeVariantId ownership", () => {
  it("returns 404 and does not write when the variant belongs to someone else", async () => {
    db.resumeVariant.findFirst.mockResolvedValue(null);
    const res = await PATCH(json("PATCH", { resumeVariantId: FOREIGN_VARIANT }), ctx(APP_ID));
    expect(res.status).toBe(404);
    expect(db.resumeVariant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: FOREIGN_VARIANT, userId: USER } }),
    );
    expect(db.application.update).not.toHaveBeenCalled();
  });

  it("accepts a variant the caller owns", async () => {
    db.resumeVariant.findFirst.mockResolvedValue({ id: OWN_VARIANT });
    db.application.update.mockResolvedValue({ id: APP_ID });
    const res = await PATCH(json("PATCH", { resumeVariantId: OWN_VARIANT }), ctx(APP_ID));
    expect(res.status).toBe(200);
    expect(db.application.update).toHaveBeenCalledTimes(1);
  });

  it("allows clearing the variant without a lookup", async () => {
    db.application.update.mockResolvedValue({ id: APP_ID });
    const res = await PATCH(json("PATCH", { resumeVariantId: null }), ctx(APP_ID));
    expect(res.status).toBe(200);
    expect(db.resumeVariant.findFirst).not.toHaveBeenCalled();
  });
});

describe("jobcopilot-10: bad ids and unmapped Prisma errors", () => {
  it("GET returns 404 for a non-UUID id without querying", async () => {
    const res = await getOne(new Request("http://localhost:3000/x"), ctx("not-a-uuid"));
    expect(res.status).toBe(404);
    expect(db.application.findFirst).not.toHaveBeenCalled();
  });

  it("PATCH returns 404 for a non-UUID id without writing", async () => {
    const res = await PATCH(json("PATCH", { notes: "x" }), ctx("not-a-uuid"));
    expect(res.status).toBe(404);
    expect(db.application.update).not.toHaveBeenCalled();
  });

  it("PATCH maps P2025 to 404", async () => {
    db.application.update.mockRejectedValue(prismaError("P2025"));
    const res = await PATCH(json("PATCH", { notes: "x" }), ctx(APP_ID));
    expect(res.status).toBe(404);
  });

  it("PATCH maps P2003 to 400", async () => {
    db.application.update.mockRejectedValue(prismaError("P2003"));
    const res = await PATCH(json("PATCH", { notes: "x" }), ctx(APP_ID));
    expect(res.status).toBe(400);
  });

  it("PATCH still rethrows unknown errors", async () => {
    db.application.update.mockRejectedValue(prismaError("P9999"));
    await expect(PATCH(json("PATCH", { notes: "x" }), ctx(APP_ID))).rejects.toThrow();
  });

  it("contacts PUT returns 404 for a non-UUID id and on P2025", async () => {
    const bad = await putContacts(json("PUT", { contacts: [] }), ctx("not-a-uuid"));
    expect(bad.status).toBe(404);
    expect(db.application.update).not.toHaveBeenCalled();

    db.application.update.mockRejectedValue(prismaError("P2025"));
    const gone = await putContacts(json("PUT", { contacts: [] }), ctx(APP_ID));
    expect(gone.status).toBe(404);
  });
});

describe("jobcopilot-10: non-UUID path id on LLM routes", () => {
  it("PATCH draft-cover-letter returns 404 without querying", async () => {
    const res = await patchDraft(json("PATCH", { draftId: DRAFT_ID }), ctx("not-a-uuid"));
    expect(res.status).toBe(404);
    expect(db.draftedContent.findFirst).not.toHaveBeenCalled();
  });

  it("POST draft-cover-letter returns 404 even when the body carries applicationId", async () => {
    const res = await postDraft(
      json("POST", { applicationId: APP_ID, resumeVariantId: OWN_VARIANT }),
      ctx("not-a-uuid"),
    );
    expect(res.status).toBe(404);
    expect(db.application.findFirst).not.toHaveBeenCalled();
    expect(getClaude).not.toHaveBeenCalled();
  });

  it("POST suggest-bullets returns 404 even when the body carries applicationId", async () => {
    const res = await postBullets(
      json("POST", { applicationId: APP_ID, resumeVariantId: OWN_VARIANT }),
      ctx("not-a-uuid"),
    );
    expect(res.status).toBe(404);
    expect(db.application.findFirst).not.toHaveBeenCalled();
    expect(getClaude).not.toHaveBeenCalled();
  });

  it("application detail page calls notFound for a non-UUID id", async () => {
    vi.doMock("next/navigation", () => ({
      notFound: () => {
        throw new Error("notFound");
      },
      redirect: () => {
        throw new Error("redirect");
      },
    }));
    vi.doMock("@/components/application-detail-tabs", () => ({
      ApplicationDetailTabs: () => null,
    }));
    const { default: Page } = await import("@/app/(app)/applications/[id]/page");
    await expect(Page({ params: { id: "not-a-uuid" } })).rejects.toThrow("notFound");
    expect(db.application.findFirst).not.toHaveBeenCalled();
  }, 30000);
});

describe("jobcopilot-05: resumeVariant reads are owner scoped", () => {
  const scoped = { where: { userId: USER } };

  it("GET /api/applications", async () => {
    db.application.findMany.mockResolvedValue([]);
    await getList();
    const args = db.application.findMany.mock.calls[0]?.[0] as { include: { resumeVariant: unknown } };
    expect(args.include.resumeVariant).toEqual(scoped);
  });

  it("GET /api/applications/[id]", async () => {
    db.application.findFirst.mockResolvedValue({ id: APP_ID });
    await getOne(new Request("http://localhost:3000/x"), ctx(APP_ID));
    const args = db.application.findFirst.mock.calls[0]?.[0] as { include: { resumeVariant: unknown } };
    expect(args.include.resumeVariant).toEqual(scoped);
  });

  it("application detail page", async () => {
    vi.doMock("next/navigation", () => ({
      notFound: () => {
        throw new Error("notFound");
      },
      redirect: () => {
        throw new Error("redirect");
      },
    }));
    vi.doMock("@/components/application-detail-tabs", () => ({
      ApplicationDetailTabs: () => null,
    }));
    db.application.findFirst.mockResolvedValue({
      id: APP_ID,
      status: "wishlist",
      jobPosting: { company: "c", title: "t", sourceUrl: "" },
    });
    db.resumeVariant.findMany.mockResolvedValue([]);
    const { default: Page } = await import("@/app/(app)/applications/[id]/page");
    await Page({ params: { id: APP_ID } });
    const args = db.application.findFirst.mock.calls[0]?.[0] as { include: { resumeVariant: unknown } };
    expect(args.include.resumeVariant).toEqual(scoped);
  });
});

describe("jobcopilot-17: rawHtml is never selected", () => {
  function expectNoRawHtml(args: unknown): void {
    const a = args as { include?: Record<string, unknown> };
    const jp = a.include?.jobPosting as { select?: Record<string, boolean> } | boolean | undefined;
    expect(jp).not.toBe(true);
    expect(typeof jp).toBe("object");
    const select = (jp as { select?: Record<string, boolean> }).select;
    expect(select).toBeDefined();
    expect(select?.rawHtml).toBeUndefined();
    expect(select?.title).toBe(true);
    expect(select?.company).toBe(true);
  }

  it("GET /api/applications", async () => {
    db.application.findMany.mockResolvedValue([]);
    await getList();
    expectNoRawHtml(db.application.findMany.mock.calls[0]?.[0]);
  });

  it("GET /api/applications/[id]", async () => {
    db.application.findFirst.mockResolvedValue({ id: APP_ID });
    await getOne(new Request("http://localhost:3000/x"), ctx(APP_ID));
    expectNoRawHtml(db.application.findFirst.mock.calls[0]?.[0]);
  });

  it("application detail page", async () => {
    vi.doMock("next/navigation", () => ({
      notFound: () => {
        throw new Error("notFound");
      },
      redirect: () => {
        throw new Error("redirect");
      },
    }));
    vi.doMock("@/components/application-detail-tabs", () => ({
      ApplicationDetailTabs: () => null,
    }));
    db.application.findFirst.mockResolvedValue({
      id: APP_ID,
      status: "wishlist",
      jobPosting: { company: "c", title: "t", sourceUrl: "" },
    });
    db.resumeVariant.findMany.mockResolvedValue([]);
    const { default: Page } = await import("@/app/(app)/applications/[id]/page");
    await Page({ params: { id: APP_ID } });
    expectNoRawHtml(db.application.findFirst.mock.calls[0]?.[0]);
  });
});
