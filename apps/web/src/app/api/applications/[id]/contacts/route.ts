import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { prisma, Prisma } from "@jobcopilot/db";
import { z } from "zod";
import { contactSchema } from "@jobcopilot/shared";
import { isPrismaError, isUuid } from "@/lib/application-queries";

const schema = z.object({ contacts: z.array(contactSchema) });

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const app = await prisma.application.update({
      where: { id: params.id, userId: data.user.id },
      data: { contacts: parsed.data.contacts as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json(app);
  } catch (err) {
    if (isPrismaError(err, "P2025")) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    throw err;
  }
}
