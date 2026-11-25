import { lookup as dnsLookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { pipeline, type Readable } from "node:stream";
import zlib from "node:zlib";
import type { AtsSource } from "@jobcopilot/shared";

export interface ScrapeResult {
  text: string;
  html: string;
  detectedAts: AtsSource;
}

/** One GET request, to be sent without following redirects. */
export interface ScrapeRequest {
  url: URL;
  /** The only IP addresses the connection may be made to. */
  addresses: string[];
  signal: AbortSignal;
}

export interface ScrapeResponse {
  status: number;
  /** Response headers by lower-case name. */
  headers: Record<string, string | undefined>;
  /** Body bytes with any Content-Encoding already undone. */
  body: AsyncIterable<Uint8Array>;
}

/** DNS and HTTP are replaceable so tests can run without a network. */
export interface ScrapeDeps {
  resolve?: (hostname: string) => Promise<string[]>;
  fetch?: (request: ScrapeRequest) => Promise<ScrapeResponse>;
}

const SCRAPE_TIMEOUT_MS = 10_000;
const SCRAPE_MAX_BYTES = 2_000_000;
const SCRAPE_MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

// scrape() fetches URLs supplied by users, so it must only ever connect to
// public unicast addresses. Everything else (loopback, private networks,
// link-local, cloud metadata services) is listed here and refused.
const BLOCKED_IPV4 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT, Alibaba metadata 100.100.100.200
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata 169.254.169.254
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments, Oracle metadata 192.0.0.192
  ["192.0.2.0", 24], // documentation
  ["192.88.99.0", 24], // 6to4 relay
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
  ["168.63.129.16", 32], // Azure metadata and wireserver
] as const) {
  BLOCKED_IPV4.addSubnet(network, prefix, "ipv4");
}
// IPv6: only global unicast, 2000::/3, is allowed. The first three entries
// are everything outside it, which takes in loopback ::1, IPv4-mapped
// ::ffff:0:0/96, NAT64 64:ff9b::/96, unique local fc00::/7, link-local
// fe80::/10 and multicast ff00::/8. This is a separate list because BlockList
// also tests an IPv4 address against IPv6 rules as if it were IPv4-mapped, and
// ::/3 would then refuse every IPv4 address.
const BLOCKED_IPV6 = new BlockList();
for (const [network, prefix] of [
  ["::", 3],
  ["4000::", 2],
  ["8000::", 1],
  ["2001::", 23], // IETF protocol assignments, Teredo
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4, which wraps an IPv4 address
  ["3fff::", 20], // documentation
] as const) {
  BLOCKED_IPV6.addSubnet(network, prefix, "ipv6");
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

// The two helpers below replace regexes that rescanned to the end of the
// input from every opener when no closer followed. That is quadratic, and a
// 2 MB page of "<script" or "<a" blocked the event loop for minutes. Each
// helper walks the input once.

// Removes every <tag ... </tag> block. An opener with no closer removes the
// rest of the input, which is how a browser reads an unclosed script or style.
// A tag name ends at whitespace, "/" or ">", so <styled-box> is not a style
// opener, and an end tag may have whitespace before ">" (</script >).
function stripBlocks(html: string, tag: "script" | "style"): string {
  const open = new RegExp(`<${tag}(?=[\\s/>])`, "gi");
  const close = new RegExp(`</${tag}\\s*>`, "gi");
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

function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  // Refuse anything that is not a plain IP address. A zone id ("%eth0") only
  // appears on link-local addresses.
  if (family === 0 || address.includes("%")) return true;
  return family === 4
    ? BLOCKED_IPV4.check(address, "ipv4")
    : BLOCKED_IPV6.check(address, "ipv6");
}

// The Playwright flow (tests/e2e/google-referral.spec.ts) scrapes a fixture
// page served by the dev server itself. Those routes return 404 in production
// and this exemption is off there too.
function isDevFixture(url: URL): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    url.protocol === "http:" &&
    url.host === "localhost:3000" &&
    url.pathname.startsWith("/api/test-mock/")
  );
}

async function resolveHost(hostname: string): Promise<string[]> {
  const records = await dnsLookup(hostname, { all: true });
  return records.map((record) => record.address);
}

// dns.lookup cannot be cancelled, so stop waiting for it when the deadline passes.
function orAbort<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

// Checks one hop (the first URL or a redirect target) and returns the
// addresses the request may connect to. Every address the host resolves to
// has to be public, so a name with one public and one private record is refused.
async function checkedAddresses(
  url: URL,
  resolve: (hostname: string) => Promise<string[]>,
  signal: AbortSignal,
): Promise<string[]> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`unsupported protocol: ${url.protocol}`);
  }
  if (url.username || url.password) throw new Error("credentials in the URL are not allowed");

  // URL has already normalised forms like 2130706433 or 0x7f.1 to 127.0.0.1,
  // and it keeps the brackets around an IPv6 literal.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : await orAbort(resolve(host), signal);
  if (addresses.length === 0) throw new Error(`no address for host: ${host}`);
  if (isDevFixture(url)) return addresses;

  const blocked = addresses.find(isBlockedAddress);
  if (blocked !== undefined) throw new Error(`blocked address for host ${host}: ${blocked}`);
  return addresses;
}

// Decompressors that tolerate a truncated stream, as browsers and curl do.
const INFLATE_OPTIONS = {
  flush: zlib.constants.Z_SYNC_FLUSH,
  finishFlush: zlib.constants.Z_SYNC_FLUSH,
};
const BROTLI_OPTIONS = {
  flush: zlib.constants.BROTLI_OPERATION_FLUSH,
  finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH,
};

// Undoes the response's Content-Encoding as the body streams through. scrape()
// counts the output of this stream against its size cap, so a small compressed
// body cannot expand past the cap. Exported for the test of exactly that.
export function decodeContent(body: Readable, encoding: string | undefined): Readable {
  const ignoreError = () => {};
  switch ((encoding ?? "").trim().toLowerCase()) {
    case "":
    case "identity":
      return body;
    case "gzip":
    case "x-gzip":
      return pipeline(body, zlib.createGunzip(INFLATE_OPTIONS), ignoreError);
    case "deflate":
      return pipeline(body, zlib.createInflate(INFLATE_OPTIONS), ignoreError);
    case "br":
      return pipeline(body, zlib.createBrotliDecompress(BROTLI_OPTIONS), ignoreError);
    default:
      throw new Error(`unsupported content-encoding: ${encoding}`);
  }
}

// The default transport. It answers the socket's DNS lookup with the addresses
// that were just checked, so the connection cannot go anywhere else even if
// the name resolves differently a moment later (DNS rebinding). The host name
// is still used for the Host header and the TLS certificate check.
function pinnedGet({ url, addresses, signal }: ScrapeRequest): Promise<ScrapeResponse> {
  const pinned = addresses.map((address) => ({ address, family: isIP(address) }));
  const lookup: LookupFunction = (_hostname, options, callback) => {
    const first = pinned[0];
    if (!first) callback(new Error("no address to connect to"), "");
    else if (options.all) callback(null, pinned);
    else callback(null, first.address, first.family);
  };

  return new Promise<ScrapeResponse>((resolve, reject) => {
    const request = (url.protocol === "https:" ? https : http).request(
      url,
      {
        agent: false,
        lookup,
        signal,
        headers: {
          "User-Agent": "JobCopilot/0.1 (+https://jobcopilot.app)",
          Accept: "*/*",
          "Accept-Language": "*",
          "Accept-Encoding": "gzip, deflate, br",
        },
      },
      (res) => {
        try {
          resolve({
            status: res.statusCode ?? 0,
            headers: {
              location: res.headers.location,
              "content-length": res.headers["content-length"],
            },
            body: decodeContent(res, res.headers["content-encoding"]),
          });
        } catch (err) {
          request.destroy();
          reject(err);
        }
      },
    );
    request.on("error", reject);
    request.end();
  });
}

// Reads the body as UTF-8 and gives up at the first chunk that takes it past
// the cap. Throwing out of the loop closes the stream, so the rest of a huge
// or endless response is never downloaded or inflated.
async function readBody(body: AsyncIterable<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  let bytes = 0;
  let html = "";
  for await (const chunk of body) {
    bytes += chunk.byteLength;
    if (bytes > SCRAPE_MAX_BYTES) {
      throw new Error(`scrape response too large: more than ${SCRAPE_MAX_BYTES} bytes`);
    }
    html += decoder.decode(chunk, { stream: true });
  }
  return html + decoder.decode();
}

export async function scrape(url: string, deps: ScrapeDeps = {}): Promise<ScrapeResult> {
  const resolve = deps.resolve ?? resolveHost;
  const send = deps.fetch ?? pinnedGet;

  // One deadline covers DNS, every redirect hop and the body. Aborting on the
  // way out also closes any response that was not read to the end.
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error("scrape timed out")),
    SCRAPE_TIMEOUT_MS,
  );
  try {
    // Redirects are followed by hand so that each target goes through the
    // same checks as the first URL.
    let current = new URL(url);
    for (let redirects = 0; ; redirects++) {
      controller.signal.throwIfAborted();
      const addresses = await checkedAddresses(current, resolve, controller.signal);
      const res = await send({ url: current, addresses, signal: controller.signal });

      if (!REDIRECT_STATUSES.has(res.status)) {
        if (res.status < 200 || res.status > 299) throw new Error(`scrape failed: ${res.status}`);

        // A shortcut only: for a compressed response this is the size on the
        // wire, so readBody enforces the cap on what actually arrives.
        const contentLength = res.headers["content-length"];
        if (contentLength && Number(contentLength) > SCRAPE_MAX_BYTES) {
          throw new Error(`scrape response too large: ${contentLength} bytes`);
        }

        const html = await readBody(res.body);
        return { text: htmlToText(html), html, detectedAts: detectAts(url) };
      }

      if (redirects === SCRAPE_MAX_REDIRECTS) {
        throw new Error(`too many redirects (more than ${SCRAPE_MAX_REDIRECTS})`);
      }
      const location = res.headers.location;
      if (!location) throw new Error(`redirect without location: ${res.status}`);
      current = new URL(location, current);
    }
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
