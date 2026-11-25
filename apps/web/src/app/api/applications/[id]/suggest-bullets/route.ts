import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { prisma, Prisma } from "@jobcopilot/db";
import { getClaude } from "@/lib/claude";
import { isUuid } from "@/lib/application-queries";
import {
  buildSuggestBulletsRequest,
  parseBulletSuggestionsResponse,
  type CachedPrefixInputs,
} from "@jobcopilot/prompts";
import { suggestBulletsRequestSchema } from "@jobcopilot/shared";
import type { ResumeSection } from "@jobcopilot/shared";

// ---------------------------------------------------------------------------
// POST — Generate resume bullet suggestions via Claude
// ---------------------------------------------------------------------------

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  if (!isUuid(params.id)) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = suggestBulletsRequestSchema.safeParse({
    applicationId: params.id,
    ...(body as Record<string, unknown>),
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [app, variant, profile] = await Promise.all([
    prisma.application.findFirst({
      where: { id: params.id, userId: data.user.id },
      include: { jobPosting: true },
    }),
    prisma.resumeVariant.findFirst({
      where: { id: parsed.data.resumeVariantId, userId: data.user.id },
    }),
    prisma.profile.findUnique({ where: { userId: data.user.id } }),
  ]);
  if (!app || !variant || !profile) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const cached: CachedPrefixInputs = {
    baseResumeText: profile.baseResumeText,
    skills: profile.skills,
    targetRoles: profile.targetRoles,
    toneGuidance: "Direct, concrete, specific. Lead with evidence. No filler.",
  };

  const claude = getClaude();
  let suggestions: ReturnType<typeof parseBulletSuggestionsResponse>;
  try {
    const res = await claude.messages.create(
      buildSuggestBulletsRequest({
        cached,
        // variant.bullets is a Prisma Json field; cast to ResumeSection[] for the prompt builder
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sections: variant.bullets as any as ResumeSection[],
        jobPostingText:
          app.jobPosting.description + "\n\n" + app.jobPosting.requirements.join("\n"),
        company: app.jobPosting.company,
        title: app.jobPosting.title,
        emphasisKeywords: variant.emphasisKeywords,
      }),
    );
    suggestions = parseBulletSuggestionsResponse(res);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI generation failed";
    const isParseError = msg.includes("Invalid") || msg.includes("Expected");
    console.error("[suggest-bullets] AI error:", e);
    return NextResponse.json({ error: msg }, { status: isParseError ? 422 : 502 });
  }

  const priorMax = await prisma.draftedContent.aggregate({
    where: { applicationId: app.id, kind: "resume_bullets" },
    _max: { version: true },
  });
  const nextVersion = (priorMax._max.version ?? 0) + 1;
  const priorLatest =
    priorMax._max.version != null
      ? await prisma.draftedContent.findFirst({
          where: {
            applicationId: app.id,
            kind: "resume_bullets",
            version: priorMax._max.version,
          },
        })
      : null;

  let draft: Awaited<ReturnType<typeof prisma.draftedContent.create>>;
  try {
    draft = await prisma.draftedContent.create({
      data: {
        applicationId: app.id,
        kind: "resume_bullets",
        version: nextVersion,
        parentDraftId: priorLatest?.id ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalPromptInputs: {
          resumeVariantId: variant.id,
        } as any,
        aiDraft: JSON.stringify(suggestions),
        userEdited: "",
        finalized: false,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "version conflict, please retry" }, { status: 409 });
    }
    throw e;
  }

  await prisma.application.update({
    where: { id: app.id },
    data: { resumeVariantId: variant.id },
  });

  return NextResponse.json({ draftId: draft.id, version: draft.version, suggestions });
}
