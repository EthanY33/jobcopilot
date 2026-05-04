import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@jobcopilot/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  emphasisKeywords: z.array(z.string()).optional(),
  bullets: z
    .array(z.object({ section: z.string(), items: z.array(z.string()) }))
    .optional(),
});

function isPrismaError(err: unknown, code: string): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code?: string }).code === code
  );
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const v = await prisma.resumeVariant.update({
      where: { id: params.id, userId: data.user.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.emphasisKeywords !== undefined
          ? { emphasisKeywords: parsed.data.emphasisKeywords }
          : {}),
        ...(parsed.data.bullets !== undefined
          ? { bullets: parsed.data.bullets as unknown as object }
          : {}),
      },
    });
    return NextResponse.json(v);
  } catch (err) {
    if (isPrismaError(err, "P2025")) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (isPrismaError(err, "P2002")) {
      return NextResponse.json(
        { error: "a variant with that name already exists" },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  try {
    await prisma.resumeVariant.delete({
      where: { id: params.id, userId: data.user.id },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isPrismaError(err, "P2025")) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    throw err;
  }
}
