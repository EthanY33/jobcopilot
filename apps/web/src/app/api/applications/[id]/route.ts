import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@jobcopilot/db";
import { updateApplicationRequestSchema } from "@jobcopilot/shared";
import { JOB_POSTING_SELECT, isPrismaError, isUuid } from "@/lib/application-queries";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  if (!isUuid(params.id)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const app = await prisma.application.findFirst({
    where: { id: params.id, userId: data.user.id },
    include: {
      jobPosting: { select: JOB_POSTING_SELECT },
      resumeVariant: { where: { userId: data.user.id } },
      drafts: { orderBy: [{ kind: "asc" }, { version: "desc" }] },
    },
  });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(app);
}

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
  const parsed = updateApplicationRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { status, appliedAt, followUpAt, notes, resumeVariantId } = parsed.data;

  if (typeof resumeVariantId === "string") {
    const owned = await prisma.resumeVariant.findFirst({
      where: { id: resumeVariantId, userId: data.user.id },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: "resume variant not found" }, { status: 404 });
  }

  let updated;
  try {
    updated = await prisma.application.update({
      where: { id: params.id, userId: data.user.id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(resumeVariantId !== undefined ? { resumeVariantId } : {}),
        ...(appliedAt !== undefined
          ? { appliedAt: appliedAt !== null ? new Date(appliedAt) : null }
          : status === "applied"
            ? { appliedAt: new Date() }
            : {}),
        ...(followUpAt !== undefined
          ? { followUpAt: followUpAt !== null ? new Date(followUpAt) : null }
          : {}),
      },
    });
  } catch (err) {
    if (isPrismaError(err, "P2025")) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (isPrismaError(err, "P2003")) {
      return NextResponse.json({ error: "invalid reference" }, { status: 400 });
    }
    throw err;
  }
  return NextResponse.json(updated);
}
