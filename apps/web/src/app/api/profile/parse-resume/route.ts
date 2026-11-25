import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getClaude } from "@/lib/claude";
import { isPrismaError } from "@/lib/application-queries";
import { buildResumeParseRequest, parseResumeResponse } from "@jobcopilot/prompts";
import { prisma } from "@jobcopilot/db";

// A resume is a page or two. The whole PDF is sent to Claude and billed per
// page, so the cap bounds what one upload can cost.
const MAX_RESUME_PDF_BYTES = 5 * 1024 * 1024;
// Room for the multipart boundaries and part headers around the file.
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

function fileTooLarge() {
  return NextResponse.json(
    { error: "file_too_large", maxBytes: MAX_RESUME_PDF_BYTES },
    { status: 413 },
  );
}

export async function POST(request: Request) {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  // Check the declared size first so an oversized body is never read into
  // memory. The header can be missing, so the file is checked again below.
  const declaredBytes = Number(request.headers.get("content-length"));
  if (declaredBytes > MAX_RESUME_PDF_BYTES + MULTIPART_OVERHEAD_BYTES) return fileTooLarge();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid form data" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ error: "pdf required" }, { status: 400 });
  }
  if (file.size > MAX_RESUME_PDF_BYTES) return fileTooLarge();

  // The parsed resume is written to the profile row. Make sure the row is
  // there before paying for the Claude call.
  const profile = await prisma.profile.findUnique({
    where: { userId: data.user.id },
    select: { userId: true },
  });
  if (!profile) return NextResponse.json({ error: "profile not found" }, { status: 404 });

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

  try {
    await prisma.profile.update({
      where: { userId: data.user.id },
      data: {
        baseResumeText: parsed.baseResumeText,
        skills: parsed.skills,
      },
    });
  } catch (err) {
    if (isPrismaError(err, "P2025")) {
      return NextResponse.json({ error: "profile not found" }, { status: 404 });
    }
    throw err;
  }

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
