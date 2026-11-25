import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@jobcopilot/db";
import { JOB_POSTING_SELECT } from "@/lib/application-queries";

export async function GET() {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const apps = await prisma.application.findMany({
    where: { userId: data.user.id },
    include: { jobPosting: { select: JOB_POSTING_SELECT }, resumeVariant: { where: { userId: data.user.id } } },
    orderBy: { lastActivityAt: "desc" },
  });
  return NextResponse.json(apps);
}
