import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getClaude } from "@/lib/claude";
import { buildResumeParseRequest, parseResumeResponse } from "@jobcopilot/prompts";
import { prisma } from "@jobcopilot/db";

export async function POST(request: Request) {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ error: "pdf required" }, { status: 400 });
  }
  const bytes = await file.arrayBuffer();
  const b64 = Buffer.from(bytes).toString("base64");

  const claude = getClaude();

  let res;
  try {
    res = await claude.messages.create(buildResumeParseRequest({ resumeBase64Pdf: b64 }));
  } catch (err) {
    console.error("[parse-resume] claude api call failed:", err);
    return NextResponse.json(
      { error: "claude_request_failed", retryable: true },
      { status: 502 },
    );
  }

  let parsed;
  try {
    parsed = parseResumeResponse(res);
  } catch (err) {
    console.error("[parse-resume] response parse failed:", err);
    return NextResponse.json(
      { error: "parse_failed", retryable: false },
      { status: 422 },
    );
  }

  await prisma.profile.update({
    where: { userId: data.user.id },
    data: {
      baseResumeText: parsed.baseResumeText,
      skills: parsed.skills,
    },
  });

  // Also create a default "Base" ResumeVariant if none exists
  const existing = await prisma.resumeVariant.findFirst({
    where: { userId: data.user.id, name: "Base" },
  });
  if (!existing) {
    await prisma.resumeVariant.create({
      data: {
        userId: data.user.id,
        name: "Base",
        bullets: parsed.sections as any,
        emphasisKeywords: [],
      },
    });
  }

  return NextResponse.json({ ok: true, sections: parsed.sections.length });
}
