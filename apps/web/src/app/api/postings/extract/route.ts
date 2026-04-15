import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { scrape } from "@/lib/scraper";
import { getClaude } from "@/lib/claude";
import { buildJobExtractionRequest, parseJobExtractionResponse } from "@jobcopilot/prompts";
import { prisma } from "@jobcopilot/db";
import { addApplicationRequestSchema } from "@jobcopilot/shared";

export async function POST(request: Request) {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const body = await request.json();
  const parsed = addApplicationRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { url } = parsed.data;

  // Dedupe by URL
  const existing = await prisma.jobPosting.findUnique({ where: { sourceUrl: url } });
  let postingId: string;
  let extracted;

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
    const scraped = await scrape(url);
    const claude = getClaude();
    const res = await claude.messages.create(
      buildJobExtractionRequest({
        url,
        pageText: scraped.text,
        detectedAts: scraped.detectedAts,
      }),
    );
    extracted = parseJobExtractionResponse(res);
    const posting = await prisma.jobPosting.create({
      data: {
        sourceUrl: url,
        sourceAts: extracted.sourceAts,
        company: extracted.company,
        title: extracted.title,
        location: extracted.location,
        requirements: extracted.requirements,
        description: extracted.description,
        rawHtml: "",
      },
    });
    postingId = posting.id;
  }

  // Upsert Application (user can only have one app per posting)
  const app = await prisma.application.upsert({
    where: { userId_jobPostingId: { userId: data.user.id, jobPostingId: postingId } },
    create: { userId: data.user.id, jobPostingId: postingId, status: "wishlist" },
    update: {},
  });

  return NextResponse.json({ applicationId: app.id, jobPostingId: postingId, extracted });
}
