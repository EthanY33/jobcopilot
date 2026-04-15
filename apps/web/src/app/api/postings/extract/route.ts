import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { scrape } from "@/lib/scraper";
import { getClaude } from "@/lib/claude";
import { buildJobExtractionRequest, parseJobExtractionResponse } from "@jobcopilot/prompts";
import { prisma } from "@jobcopilot/db";
import { addApplicationRequestSchema, type ExtractedJobPosting } from "@jobcopilot/shared";

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

  // Dedupe by URL — postings are shared across users
  const existing = await prisma.jobPosting.findUnique({ where: { sourceUrl: url } });
  let postingId: string;
  let extracted: ExtractedJobPosting;

  if (existing) {
    postingId = existing.id;
    extracted = {
      company: existing.company,
      title: existing.title,
      location: existing.location,
      requirements: existing.requirements,
      description: existing.description,
      sourceAts: existing.sourceAts,
    };
  } else {
    let scraped;
    try {
      scraped = await scrape(url);
    } catch (err) {
      console.error("[extract] scrape failed:", err);
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
      return NextResponse.json({ error: "claude_request_failed", retryable: true }, { status: 502 });
    }

    try {
      extracted = parseJobExtractionResponse(claudeResponse);
    } catch (err) {
      console.error("[extract] claude response parse failed:", err);
      return NextResponse.json({ error: "parse_failed", retryable: false }, { status: 422 });
    }

    const posting = await prisma.jobPosting.create({
      data: {
        sourceUrl: url,
        sourceAts: extracted.sourceAts,
        company: extracted.company,
        title: extracted.title,
        location: extracted.location,
        requirements: extracted.requirements,
        description: extracted.description,
        rawHtml: scraped.html,
      },
    });
    postingId = posting.id;
  }

  // Upsert is intentional no-op on conflict — re-pasting the same URL shouldn't bump lastActivityAt
  const app = await prisma.application.upsert({
    where: { userId_jobPostingId: { userId: data.user.id, jobPostingId: postingId } },
    create: { userId: data.user.id, jobPostingId: postingId, status: "wishlist" },
    update: {},
  });

  return NextResponse.json({ applicationId: app.id, jobPostingId: postingId, extracted });
}
