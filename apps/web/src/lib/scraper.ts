import type { AtsSource } from "@jobcopilot/shared";

export interface ScrapeResult {
  text: string;
  html: string;
  detectedAts: AtsSource;
}

const SCRAPE_TIMEOUT_MS = 10_000;
const SCRAPE_MAX_BYTES = 2_000_000;

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
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`unsupported protocol: ${parsed.protocol}`);
  }

  const res = await fetch(url, {
    headers: { "User-Agent": "JobCopilot/0.1 (+https://jobcopilot.app)" },
    redirect: "follow",
    signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`scrape failed: ${res.status}`);

  const contentLength = res.headers.get("content-length");
  if (contentLength && Number(contentLength) > SCRAPE_MAX_BYTES) {
    throw new Error(`scrape response too large: ${contentLength} bytes`);
  }

  const html = await res.text();
  if (html.length > SCRAPE_MAX_BYTES) {
    throw new Error(`scrape response too large: ${html.length} bytes`);
  }

  return { text: htmlToText(html), html, detectedAts: detectAts(url) };
}
