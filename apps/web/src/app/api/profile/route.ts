import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@jobcopilot/db";
import { z } from "zod";

const updateSchema = z.object({
  targetRoles: z.array(z.string()).optional(),
  targetLocations: z.array(z.string()).optional(),
  linkedinUrl: z.string().url().nullable().optional(),
  githubUrl: z.string().url().nullable().optional(),
  portfolioUrl: z.string().url().nullable().optional(),
  phone: z.string().nullable().optional(),
  authorizedToWorkUs: z.boolean().optional(),
});

export async function GET() {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const profile = await prisma.profile.findUnique({ where: { userId: data.user.id } });
  return NextResponse.json(profile);
}

export async function PATCH(req: Request) {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  // exactOptionalPropertyTypes: Zod optional fields carry `| undefined` but
  // Prisma update inputs do not accept undefined. Strip undefined keys first.
  const updateData = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  ) as Parameters<typeof prisma.profile.update>[0]["data"];
  const updated = await prisma.profile.update({
    where: { userId: data.user.id },
    data: updateData,
  });
  return NextResponse.json(updated);
}
