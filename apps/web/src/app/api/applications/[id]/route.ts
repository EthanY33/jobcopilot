import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@jobcopilot/db";
import { updateApplicationRequestSchema } from "@jobcopilot/shared";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const app = await prisma.application.findFirst({
    where: { id: params.id, userId: data.user.id },
    include: {
      jobPosting: true,
      resumeVariant: true,
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

  const body = await req.json();
  const parsed = updateApplicationRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { status, appliedAt, followUpAt, notes, resumeVariantId } = parsed.data;

  const updated = await prisma.application.update({
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
  return NextResponse.json(updated);
}
