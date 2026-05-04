import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@jobcopilot/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  emphasisKeywords: z.array(z.string()).default([]),
  bullets: z
    .array(z.object({ section: z.string(), items: z.array(z.string()) }))
    .default([]),
});

export async function GET() {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const variants = await prisma.resumeVariant.findMany({
    where: { userId: data.user.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(variants);
}

export async function POST(req: Request) {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const v = await prisma.resumeVariant.create({
      data: {
        userId: data.user.id,
        name: parsed.data.name,
        emphasisKeywords: parsed.data.emphasisKeywords,
        bullets: parsed.data.bullets as unknown as object,
      },
    });
    return NextResponse.json(v);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "a variant with that name already exists" },
        { status: 409 },
      );
    }
    throw err;
  }
}
