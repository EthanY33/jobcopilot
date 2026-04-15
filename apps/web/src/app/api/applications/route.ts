import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@jobcopilot/db";

export async function GET() {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const apps = await prisma.application.findMany({
    where: { userId: data.user.id },
    include: { jobPosting: true, resumeVariant: true },
    orderBy: { lastActivityAt: "desc" },
  });
  return NextResponse.json(apps);
}
