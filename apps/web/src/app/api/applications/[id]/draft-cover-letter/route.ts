import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { prisma, Prisma } from "@jobcopilot/db";
import { getClaude } from "@/lib/claude";
import { isUuid } from "@/lib/application-queries";
import {
  buildCoverLetterRequest,
  parseCoverLetterResponse,
  type CachedPrefixInputs,
} from "@jobcopilot/prompts";
import { draftCoverLetterRequestSchema } from "@jobcopilot/shared";

// ---------------------------------------------------------------------------
// POST — Generate a cover letter via Claude
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
  const parsed = draftCoverLetterRequestSchema.safeParse({
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
  let output: ReturnType<typeof parseCoverLetterResponse>;
  try {
    const res = await claude.messages.create(
      buildCoverLetterRequest({
        cached,
        jobPostingText:
          app.jobPosting.description + "\n\n" + app.jobPosting.requirements.join("\n"),
        company: app.jobPosting.company,
        title: app.jobPosting.title,
        variantEmphasis: variant.emphasisKeywords,
        ...(parsed.data.override !== undefined ? { override: parsed.data.override } : {}),
      }),
    );
    output = parseCoverLetterResponse(res);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI generation failed";
    const isParseError = msg.includes("Invalid") || msg.includes("Expected");
    console.error("[draft-cover-letter] AI error:", e);
    return NextResponse.json({ error: msg }, { status: isParseError ? 422 : 502 });
  }

  const priorMax = await prisma.draftedContent.aggregate({
    where: { applicationId: app.id, kind: "cover_letter" },
    _max: { version: true },
  });
  const nextVersion = (priorMax._max.version ?? 0) + 1;
  const priorLatest =
    priorMax._max.version != null
      ? await prisma.draftedContent.findFirst({
          where: {
            applicationId: app.id,
            kind: "cover_letter",
            version: priorMax._max.version,
          },
        })
      : null;

  let draft: Awaited<ReturnType<typeof prisma.draftedContent.create>>;
  try {
    draft = await prisma.draftedContent.create({
      data: {
        applicationId: app.id,
        kind: "cover_letter",
        version: nextVersion,
        parentDraftId: priorLatest?.id ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalPromptInputs: {
          resumeVariantId: variant.id,
          override: parsed.data.override ?? null,
        } as any,
        aiDraft: output.body,
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
    data: { resumeVariantId: variant.id, currentCoverLetterId: draft.id },
  });

  return NextResponse.json({
    draftId: draft.id,
    version: draft.version,
    body: output.body,
    alternateOpenings: output.alternateOpenings,
  });
}

// ---------------------------------------------------------------------------
// PATCH — Save user edits and/or finalize
// ---------------------------------------------------------------------------

const updateSchema = z.object({
  draftId: z.string().uuid(),
  userEdited: z.string().optional(),
  finalized: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const draft = await prisma.draftedContent.findFirst({
    where: {
      id: parsed.data.draftId,
      application: { id: params.id, userId: data.user.id },
    },
  });
  if (!draft) return NextResponse.json({ error: "not found" }, { status: 404 });

  const updated = await prisma.draftedContent.update({
    where: { id: draft.id },
    data: {
      userEdited: parsed.data.userEdited ?? draft.userEdited,
      finalized: parsed.data.finalized ?? draft.finalized,
      finalizedAt: parsed.data.finalized ? new Date() : draft.finalizedAt,
    },
  });

  if (parsed.data.finalized) {
    await prisma.application.update({
      where: { id: params.id, userId: data.user.id },
      data: { currentCoverLetterId: draft.id },
    });
  }

  return NextResponse.json(updated);
}
