import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { scrape } from "@/lib/scraper";
import { getClaude } from "@/lib/claude";
import { buildJobExtractionRequest, parseJobExtractionResponse } from "@jobcopilot/prompts";
import { prisma } from "@jobcopilot/db";
import { addApplicationRequestSchema, type ExtractedJobPosting } from "@jobcopilot/shared";

// Re-extract a cached posting once it is older than this
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// The database stamps discoveredAt, so allow for a small clock difference
const CLOCK_SKEW_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const userId = data.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = addApplicationRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { url } = parsed.data;

  const existing = await prisma.jobPosting.findUnique({ where: { sourceUrl: url } });
  let postingId: string;
  let extracted: ExtractedJobPosting;

  if (existing && isFresh(existing)) {
    postingId = existing.id;
    extracted = toExtracted(existing);
  } else {
    let scraped;
    try {
      scraped = await scrape(url);
    } catch (err) {
      console.error("[extract] scrape failed:", err);
      if (existing) return respondWithRow(existing, userId);
      return NextResponse.json({ error: "scrape_failed", retryable: true }, { status: 422 });
    }

    // scrape() does not report the Content-Type, so refuse a body that is
    // clearly not text before paying for a Claude call
    if (looksBinary(scraped.html)) {
      if (existing) return respondWithRow(existing, userId);
      return NextResponse.json({ error: "unsupported_content", retryable: false }, { status: 415 });
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
      if (existing) return respondWithRow(existing, userId);
      return NextResponse.json({ error: "claude_request_failed", retryable: true }, { status: 502 });
    }

    try {
      extracted = parseJobExtractionResponse(claudeResponse);
    } catch (err) {
      console.error("[extract] claude response parse failed:", err);
      if (existing) return respondWithRow(existing, userId);
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

    // A refresh that came back empty must not wipe a good extraction
    if (existing && !isThin(existing) && isThin(fields)) return respondWithRow(existing, userId);

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
      if (raced) return respondWithRow(raced, userId);
      console.error("[extract] saving posting failed:", err);
      if (existing) return respondWithRow(existing, userId);
      return NextResponse.json({ error: "posting_save_failed", retryable: true }, { status: 500 });
    }
    extracted = { ...extracted, ...fields };
  }

  return respondForPosting(postingId, extracted, userId);
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

// An extraction with no description and no requirements is a failed scrape
// (login wall, consent page, script-only shell), not a posting
function isThin(p: { description: string; requirements: string[] }): boolean {
  return p.description.trim() === "" && p.requirements.length === 0;
}

function isFresh(row: { discoveredAt: Date; description: string; requirements: string[] }): boolean {
  const age = Date.now() - row.discoveredAt.getTime();
  // A timestamp in the future is not proof of freshness
  return age > -CLOCK_SKEW_MS && age < CACHE_TTL_MS && !isThin(row);
}

function looksBinary(body: string): boolean {
  if (body.startsWith("%PDF-")) return true;
  const sample = body.slice(0, 4000);
  let bad = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    // U+FFFD marks bytes that were not UTF-8; C0 controls other than tab, LF, FF, CR
    if (c === 0xfffd || (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0c && c !== 0x0d)) bad++;
  }
  return bad >= 8 && bad / sample.length > 0.3;
}

function stripNul(s: string): string {
  return s.replace(/\u0000/g, "");
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

async function respondForPosting(postingId: string, extracted: ExtractedJobPosting, userId: string) {
  const where = { userId_jobPostingId: { userId, jobPostingId: postingId } };
  let app: { id: string } | null;
  try {
    // Upsert is intentional no-op on conflict: re-pasting the same URL shouldn't bump lastActivityAt
    app = await prisma.application.upsert({
      where,
      create: { userId, jobPostingId: postingId, status: "wishlist" },
      update: {},
    });
  } catch (err) {
    // A concurrent request for the same posting created the application first
    app = isUniqueViolation(err)
      ? await prisma.application.findUnique({ where }).catch(() => null)
      : null;
    if (!app) {
      console.error("[extract] saving application failed:", err);
      return NextResponse.json({ error: "application_save_failed", retryable: true }, { status: 500 });
    }
  }

  return NextResponse.json({ applicationId: app.id, jobPostingId: postingId, extracted });
}
