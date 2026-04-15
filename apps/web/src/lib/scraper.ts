import type { AtsSource } from "@jobcopilot/shared";

export interface ScrapeResult {
  text: string;
  detectedAts: AtsSource;
}

export function detectAts(url: string): AtsSource {
  const u = url.toLowerCase();
  if (u.includes("greenhouse.io") || u.includes("boards.greenhouse.io")) return "greenhouse";
  if (u.includes("lever.co")) return "lever";
  if (u.includes("ashbyhq.com")) return "ashby";
  if (u.includes("myworkdayjobs.com")) return "workday";
  if (u.includes("icims.com")) return "icims";
  return "manual";
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export async function scrape(url: string): Promise<ScrapeResult> {
  const res = await fetch(url, {
    headers: { "User-Agent": "JobCopilot/0.1 (+https://jobcopilot.app)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`scrape failed: ${res.status}`);
  const html = await res.text();
  return { text: htmlToText(html), detectedAts: detectAts(url) };
}
