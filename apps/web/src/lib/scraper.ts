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

// The two helpers below replace regexes that rescanned to the end of the
// input from every opener when no closer followed. That is quadratic, and a
// 2 MB page of "<script" or "<a" blocked the event loop for minutes. Each
// helper walks the input once.

// Removes every <tag ... </tag> block. An opener with no closer removes the
// rest of the input, which is how a browser reads an unclosed script or style.
function stripBlocks(html: string, tag: "script" | "style"): string {
  const open = new RegExp(`<${tag}`, "gi");
  const close = new RegExp(`</${tag}>`, "gi");
  let out = "";
  let pos = 0;
  for (;;) {
    open.lastIndex = pos;
    const start = open.exec(html);
    if (!start) return out + html.slice(pos);
    out += html.slice(pos, start.index) + " ";
    close.lastIndex = open.lastIndex;
    if (!close.exec(html)) return out;
    pos = close.lastIndex;
  }
}

// Replaces what /<[^>]+>/g matched: a "<", at least one character, then the
// next ">". Once no ">" is left, no later "<" can match either, so stop.
function stripTags(html: string): string {
  let out = "";
  let pos = 0;
  for (;;) {
    const lt = html.indexOf("<", pos);
    if (lt === -1) break;
    const gt = html.indexOf(">", lt + 1);
    if (gt === -1) break;
    if (gt === lt + 1) {
      // "<>" has nothing between the brackets, so it stays as text.
      out += html.slice(pos, gt);
      pos = gt;
      continue;
    }
    out += html.slice(pos, lt) + " ";
    pos = gt + 1;
  }
  return out + html.slice(pos);
}

export function htmlToText(html: string): string {
  return stripTags(stripBlocks(stripBlocks(html, "script"), "style"))
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
