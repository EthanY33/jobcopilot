import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("not found", { status: 404 });
  }
  const fixturePath = path.join(
    process.cwd(),
    "tests",
    "fixtures",
    "google-posting.html",
  );
  const html = fs.readFileSync(fixturePath, "utf8");
  return new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}
