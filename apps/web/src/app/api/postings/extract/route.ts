import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { scrape } from "@/lib/scraper";
import { getClaude } from "@/lib/claude";
import { buildJobExtractionRequest, parseJobExtractionResponse } from "@jobcopilot/prompts";
import { prisma } from "@jobcopilot/db";
import { addApplicationRequestSchema, type ExtractedJobPosting } from "@jobcopilot/shared";

// Re-extract a cached posting once it is older than this
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = addApplicationRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { url } = parsed.data;

  // Dedupe by URL: postings are shared across users. A cached row is trusted only
  // while it is fresh; older rows are re-extracted so a bad first scrape can heal.
  const existing = await prisma.jobPosting.findUnique({ where: { sourceUrl: url } });
  let postingId: string;
  let extracted: ExtractedJobPosting;

  const isFresh = existing && Date.now() - existing.discoveredAt.getTime() < CACHE_TTL_MS;
  if (existing && isFresh) {
    postingId = existing.id;
    extracted = toExtracted(existing);
  } else {
    let scraped;
    try {
      scraped = await scrape(url);
    } catch (err) {
      console.error("[extract] scrape failed:", err);
      if (existing) return respondWithRow(existing, data.user.id);
      return NextResponse.json({ error: "scrape_failed", retryable: true }, { status: 422 });
    }

    let claudeResponse;
    try {
      const claude = getClaude();
      claudeResponse = await claude.messages.create(
        buildJobExtractionRequest({
          url,
          pageText: scraped.text,
          detectedAts: scraped.detectedAts,
        }),
      );
    } catch (err) {
      console.error("[extract] claude request failed:", err);
      if (existing) return respondWithRow(existing, data.user.id);
      return NextResponse.json({ error: "claude_request_failed", retryable: true }, { status: 502 });
    }

    try {
      extracted = parseJobExtractionResponse(claudeResponse);
    } catch (err) {
      console.error("[extract] claude response parse failed:", err);
      if (existing) return respondWithRow(existing, data.user.id);
      return NextResponse.json({ error: "parse_failed", retryable: false }, { status: 422 });
    }

    // Postgres text columns reject NUL bytes
    const fields = {
      sourceAts: extracted.sourceAts,
      company: stripNul(extracted.company),
      title: stripNul(extracted.title),
      location: extracted.location == null ? extracted.location : stripNul(extracted.location),
      requirements: extracted.requirements.map(stripNul),
      description: stripNul(extracted.description),
    };

    try {
      if (existing) {
        const posting = await prisma.jobPosting.update({
          where: { id: existing.id },
          data: { ...fields, rawHtml: stripNul(scraped.html), discoveredAt: new Date() },
        });
        postingId = posting.id;
      } else {
        const posting = await prisma.jobPosting.create({
          data: { sourceUrl: url, ...fields, rawHtml: stripNul(scraped.html) },
        });
        postingId = posting.id;
      }
    } catch (err) {
      // Another request created the same URL between our lookup and insert
      const raced = isUniqueViolation(err)
        ? await prisma.jobPosting.findUnique({ where: { sourceUrl: url } })
        : null;
      if (!raced) {
        console.error("[extract] saving posting failed:", err);
        return NextResponse.json({ error: "posting_save_failed", retryable: true }, { status: 500 });
      }
      return respondWithRow(raced, data.user.id);
    }
    extracted = { ...extracted, ...fields };
  }

  return respondForPosting(postingId, extracted, data.user.id);
}

type PostingRow = {
  id: string;
  company: string;
  title: string;
  location: string | null;
  requirements: string[];
  description: string;
  sourceAts: ExtractedJobPosting["sourceAts"];
};

function toExtracted(row: PostingRow): ExtractedJobPosting {
  return {
    company: row.company,
    title: row.title,
    location: row.location,
    requirements: row.requirements,
    description: row.description,
    sourceAts: row.sourceAts,
  };
}

function respondWithRow(row: PostingRow, userId: string) {
  return respondForPosting(row.id, toExtracted(row), userId);
}

function stripNul(s: string): string {
  return s.replace(/\u0000/g, "");
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

async function respondForPosting(postingId: string, extracted: ExtractedJobPosting, userId: string) {
  // Upsert is intentional no-op on conflict — re-pasting the same URL shouldn't bump lastActivityAt
  const app = await prisma.application.upsert({
    where: { userId_jobPostingId: { userId, jobPostingId: postingId } },
    create: { userId, jobPostingId: postingId, status: "wishlist" },
    update: {},
  });

  return NextResponse.json({ applicationId: app.id, jobPostingId: postingId, extracted });
}
