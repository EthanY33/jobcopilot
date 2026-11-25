// @vitest-environment node
import { EventEmitter } from "node:events";
import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  decodeContent,
  detectAts,
  htmlToText,
  scrape,
  type ScrapeRequest,
  type ScrapeResponse,
} from "@/lib/scraper";

describe("detectAts", () => {
  it("detects greenhouse", () => {
    expect(detectAts("https://boards.greenhouse.io/datadog/jobs/123")).toBe("greenhouse");
    expect(detectAts("https://datadog.greenhouse.io/jobs/123")).toBe("greenhouse");
  });
  it("detects lever", () => {
    expect(detectAts("https://jobs.lever.co/stripe/123")).toBe("lever");
  });
  it("detects ashby", () => {
    expect(detectAts("https://jobs.ashbyhq.com/anthropic/123")).toBe("ashby");
  });
  it("detects workday", () => {
    expect(detectAts("https://foo.myworkdayjobs.com/en-US/careers/123")).toBe("workday");
  });
  it("detects icims", () => {
    expect(detectAts("https://careers.icims.com/jobs/123")).toBe("icims");
  });
  it("falls back to manual", () => {
    expect(detectAts("https://example.com/jobs/123")).toBe("manual");
  });
});

describe("htmlToText", () => {
  it("strips tags and entities", () => {
    expect(htmlToText("<p>Hi &amp; bye</p>")).toBe("Hi & bye");
  });
  it("drops scripts and styles", () => {
    expect(htmlToText("<p>Keep</p><script>drop()</script><style>.x{}</style>")).toBe("Keep");
  });
  it("collapses whitespace", () => {
    expect(htmlToText("<p>  a   b  \n\n c </p>")).toBe("a b c");
  });
  it("matches script and style tags in any letter case", () => {
    expect(htmlToText("<p>Keep</p><SCRIPT>drop()</ScRiPt><Style>.x{}</STYLE>")).toBe("Keep");
  });
  it("keeps text aligned when a character changes length in lower case", () => {
    // U+0130 lowercases to two code units, so offsets taken from a lowercased
    // copy of the input would be shifted.
    const dotted = String.fromCodePoint(0x130).repeat(3);
    expect(htmlToText(`${dotted}<script>drop()</script>ok`)).toBe(`${dotted} ok`);
  });
  it("drops an unclosed script or style block through the end of input", () => {
    expect(htmlToText("<p>Keep</p><script>alert(1)")).toBe("Keep");
    expect(htmlToText("<p>Keep</p><style>.x{color:red}")).toBe("Keep");
  });
  it("matches script and style tags by full name", () => {
    expect(htmlToText("<styled-box>hello</styled-box> tail text")).toBe("hello tail text");
    expect(htmlToText("<p>Keep</p><scripture>verse</scripture> tail")).toBe("Keep verse tail");
    expect(htmlToText("<p>a</p><style>.x{}</style >b")).toBe("a b");
    expect(htmlToText("<p>a</p><script>x()</script\n>b<p>c</p>")).toBe("a b c");
  });
  it("leaves a bare < with no closing > as text", () => {
    expect(htmlToText("a <> b < c")).toBe("a <> b < c");
    expect(htmlToText("x <<b> y")).toBe("x y");
  });

  // Each input below made the old regexes rescan to the end of input from
  // every opener (quadratic), which blocked the event loop for minutes at
  // this size. A single forward pass finishes in milliseconds.
  const REPEATS = 300_000;
  it("handles a page of unclosed script openers in one pass", () => {
    expect(htmlToText("<script ".repeat(REPEATS))).toBe("");
  }, 10_000);
  it("handles a page of unclosed style openers in one pass", () => {
    expect(htmlToText("<style ".repeat(REPEATS))).toBe("");
  }, 10_000);
  it("leaves script and style prefixes with no name boundary unchanged", () => {
    for (const input of ["<script".repeat(REPEATS), "<style".repeat(REPEATS)]) {
      expect(htmlToText(input) === input).toBe(true);
    }
  }, 10_000);
  it("handles a page of unclosed tag openers in one pass", () => {
    const input = "<a".repeat(REPEATS);
    expect(htmlToText(input) === input).toBe(true);
  }, 10_000);
});

// Stand-ins for public hosts. Nothing in this file opens a socket: DNS and
// HTTP are both injected.
const PUBLIC_V4 = "93.184.216.34";
const PUBLIC_V6 = "2606:2800:220:1:248:1893:25c8:1946";

async function* bytes(...parts: string[]): AsyncGenerator<Uint8Array> {
  for (const part of parts) yield new TextEncoder().encode(part);
}

function page(html: string, headers: Record<string, string> = {}): ScrapeResponse {
  return { status: 200, headers, body: bytes(html) };
}

function redirectTo(location: string, status = 302): ScrapeResponse {
  return { status, headers: { location }, body: bytes() };
}

// Fake DNS: host name to the addresses it resolves to.
function dns(table: Record<string, string[]>) {
  return vi.fn(async (hostname: string) => table[hostname] ?? []);
}

// Fake HTTP layer: full URL to the response it serves.
function web(routes: Record<string, () => ScrapeResponse>) {
  return vi.fn(async (request: ScrapeRequest) => {
    const route = routes[request.url.href];
    if (!route) throw new Error(`unexpected request: ${request.url.href}`);
    return route();
  });
}

describe("scrape", () => {
  // scrape() must only talk through its own transport. The global fetch does
  // its own DNS lookup and follows redirects by itself, so reaching it would
  // skip every check below. Stubbing it also keeps these tests off the network.
  const globalFetch = vi.fn(async () => new Response("<p>fetched without checks</p>"));
  beforeEach(() => {
    globalFetch.mockClear();
    vi.stubGlobal("fetch", globalFetch);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    expect(globalFetch).not.toHaveBeenCalled();
  });

  it("returns the page for a host that resolves to public addresses", async () => {
    const resolve = dns({ "jobs.example.com": [PUBLIC_V4, PUBLIC_V6] });
    const fetch = web({ "https://jobs.example.com/role/1": () => page("<h1>Engineer</h1>") });

    const result = await scrape("https://jobs.example.com/role/1", { resolve, fetch });

    expect(result).toEqual({ text: "Engineer", html: "<h1>Engineer</h1>", detectedAts: "manual" });
    expect(resolve).toHaveBeenCalledWith("jobs.example.com");
  });

  it("pins the request to the addresses it checked", async () => {
    const resolve = dns({ "jobs.example.com": [PUBLIC_V4, PUBLIC_V6] });
    const fetch = web({ "https://jobs.example.com/role/1": () => page("<h1>Engineer</h1>") });

    await scrape("https://jobs.example.com/role/1", { resolve, fetch });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0].addresses).toEqual([PUBLIC_V4, PUBLIC_V6]);
  });

  it("aborts the request signal once it is done, which closes unread responses", async () => {
    const resolve = dns({ "jobs.example.com": [PUBLIC_V4] });
    const fetch = web({ "https://jobs.example.com/": () => page("ok") });

    await scrape("https://jobs.example.com/", { resolve, fetch });

    expect(fetch.mock.calls[0]?.[0].signal.aborted).toBe(true);
  });

  it("fails on a final response that is not 2xx", async () => {
    const resolve = dns({ "jobs.example.com": [PUBLIC_V4] });
    const fetch = web({
      "https://jobs.example.com/gone": () => ({ status: 404, headers: {}, body: bytes("nope") }),
    });

    await expect(scrape("https://jobs.example.com/gone", { resolve, fetch })).rejects.toThrow(
      "scrape failed: 404",
    );
  });

  it.each([
    "file:///etc/passwd",
    "ftp://jobs.example.com/x",
    "data:text/html,<p>x</p>",
    "javascript:alert(1)",
  ])("rejects the scheme of %s", async (url) => {
    const resolve = dns({});
    const fetch = web({});

    await expect(scrape(url, { resolve, fetch })).rejects.toThrow(/unsupported protocol/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a URL that carries credentials", async () => {
    const resolve = dns({ "jobs.example.com": [PUBLIC_V4] });
    const fetch = web({});

    await expect(
      scrape("https://user:secret@jobs.example.com/", { resolve, fetch }),
    ).rejects.toThrow(/credentials/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    // IPv4: loopback, "this" network, private, link-local and metadata,
    // carrier-grade NAT, multicast, reserved.
    "http://127.0.0.1/",
    "http://127.255.255.254:8080/admin",
    "http://0.0.0.0/",
    "http://10.0.0.1/",
    "http://10.255.255.255/",
    "http://172.16.0.1/",
    "http://172.31.255.255/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://100.64.0.1/",
    "http://100.127.255.255/",
    "http://100.100.100.200/latest/meta-data/",
    "http://192.0.0.192/opc/v1/instance/",
    "http://168.63.129.16/metadata/instance",
    "http://224.0.0.1/",
    "http://239.255.255.255/",
    "http://240.0.0.1/",
    "http://255.255.255.255/",
    // Other spellings of 127.0.0.1.
    "http://2130706433/",
    "http://0x7f.1/",
    "http://017700000001/",
    "http://127.1/",
    // IPv6: loopback, unspecified, IPv4-mapped, unique local, link-local,
    // site-local, multicast, NAT64, 6to4, documentation.
    "http://[::1]/",
    "http://[::]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:10.0.0.1]/",
    "http://[::ffff:a9fe:a9fe]/latest/meta-data/",
    "http://[fc00::1]/",
    "http://[fd00:ec2::254]/latest/meta-data/",
    "http://[fe80::1]/",
    "http://[febf::1]/",
    "http://[fec0::1]/",
    "http://[ff02::1]/",
    "http://[64:ff9b::7f00:1]/",
    "http://[2002:7f00:1::1]/",
    "http://[2001:db8::1]/",
  ])("rejects the address literal in %s", async (url) => {
    const resolve = dns({});
    const fetch = web({});

    await expect(scrape(url, { resolve, fetch })).rejects.toThrow(/blocked address/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    // The nearest public address on each side of a blocked range.
    "http://9.255.255.255/",
    "http://11.0.0.0/",
    "http://100.63.255.255/",
    "http://100.128.0.0/",
    "http://126.255.255.255/",
    "http://128.0.0.0/",
    "http://169.253.255.255/",
    "http://169.255.0.0/",
    "http://172.15.255.255/",
    "http://172.32.0.0/",
    "http://192.167.255.255/",
    "http://192.169.0.0/",
    "http://223.255.255.255/",
    "http://[2001:200::1]/",
    "http://[2001:db9::1]/",
    "http://[2003::1]/",
    "http://[2606:4700:4700::1111]/",
    "http://[2a00:1450:4001:81b::200e]/",
    "http://[3ffe::1]/",
  ])("allows the public address literal in %s", async (url) => {
    const resolve = dns({});
    const fetch = vi.fn(async (_request: ScrapeRequest) => page("ok"));

    await expect(scrape(url, { resolve, fetch })).resolves.toMatchObject({ text: "ok" });
    expect(resolve).not.toHaveBeenCalled();
  });

  it.each<[string, string[]]>([
    ["a loopback address", ["127.0.0.1"]],
    ["a private address", ["10.1.2.3"]],
    ["the cloud metadata address", ["169.254.169.254"]],
    ["a unique local IPv6 address", ["fd12:3456:789a::1"]],
    ["an IPv4-mapped loopback address", ["::ffff:127.0.0.1"]],
    ["a link-local address with a zone id", ["fe80::1%eth0"]],
    ["one private address among public ones", [PUBLIC_V4, "192.168.0.10", PUBLIC_V6]],
    ["no address", []],
    ["something that is not an IP address", ["jobs.example.com"]],
  ])("rejects a host that resolves to %s", async (_label, addresses) => {
    const resolve = dns({ "internal.example.com": addresses });
    const fetch = web({});

    await expect(scrape("https://internal.example.com/", { resolve, fetch })).rejects.toThrow(
      /blocked address|no address/,
    );
    expect(resolve).toHaveBeenCalledWith("internal.example.com");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("follows a redirect after checking the new host", async () => {
    const resolve = dns({ "short.example.com": [PUBLIC_V4], "jobs.example.com": [PUBLIC_V6] });
    const fetch = web({
      "https://short.example.com/r": () => redirectTo("https://jobs.example.com/role/1"),
      "https://jobs.example.com/role/1": () => page("<p>Role</p>"),
    });

    const result = await scrape("https://short.example.com/r", { resolve, fetch });

    expect(result.text).toBe("Role");
    expect(resolve.mock.calls.map(([hostname]) => hostname)).toEqual([
      "short.example.com",
      "jobs.example.com",
    ]);
    expect(fetch.mock.calls.map(([request]) => request.addresses)).toEqual([
      [PUBLIC_V4],
      [PUBLIC_V6],
    ]);
  });

  it("resolves a relative redirect against the current URL", async () => {
    const resolve = dns({ "jobs.example.com": [PUBLIC_V4] });
    const fetch = web({
      "https://jobs.example.com/old": () => redirectTo("/new?id=2", 301),
      "https://jobs.example.com/new?id=2": () => page("<p>Moved</p>"),
    });

    const result = await scrape("https://jobs.example.com/old", { resolve, fetch });

    expect(result.text).toBe("Moved");
  });

  it.each([
    "http://127.0.0.1:8080/admin",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://internal.example.com/",
    "//localhost/secret",
  ])("rejects a redirect to %s", async (location) => {
    const resolve = dns({
      "short.example.com": [PUBLIC_V4],
      "internal.example.com": ["10.0.0.5"],
      localhost: ["127.0.0.1"],
    });
    const fetch = web({ "https://short.example.com/r": () => redirectTo(location) });

    await expect(scrape("https://short.example.com/r", { resolve, fetch })).rejects.toThrow(
      /blocked address/,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([301, 302, 303, 307, 308])("checks the target of a %i redirect", async (status) => {
    const resolve = dns({ "short.example.com": [PUBLIC_V4] });
    const fetch = web({
      "https://short.example.com/r": () => redirectTo("http://127.0.0.1/", status),
    });

    await expect(scrape("https://short.example.com/r", { resolve, fetch })).rejects.toThrow(
      /blocked address/,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects a redirect to a scheme other than http or https", async () => {
    const resolve = dns({ "short.example.com": [PUBLIC_V4] });
    const fetch = web({ "https://short.example.com/r": () => redirectTo("file:///etc/passwd") });

    await expect(scrape("https://short.example.com/r", { resolve, fetch })).rejects.toThrow(
      /unsupported protocol/,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects a redirect that has no location", async () => {
    const resolve = dns({ "short.example.com": [PUBLIC_V4] });
    const fetch = web({
      "https://short.example.com/r": () => ({ status: 302, headers: {}, body: bytes() }),
    });

    await expect(scrape("https://short.example.com/r", { resolve, fetch })).rejects.toThrow(
      /redirect without location/,
    );
  });

  it("stops after 5 redirects", async () => {
    const resolve = dns({ "loop.example.com": [PUBLIC_V4] });
    let hops = 0;
    const fetch = vi.fn(async (_request: ScrapeRequest) =>
      redirectTo(`https://loop.example.com/${++hops}`),
    );

    await expect(scrape("https://loop.example.com/0", { resolve, fetch })).rejects.toThrow(
      /too many redirects/,
    );
    expect(fetch).toHaveBeenCalledTimes(6);
  });

  it("gives up when the lookup outlasts the timeout", async () => {
    vi.useFakeTimers();
    try {
      const resolve = vi.fn(() => new Promise<string[]>(() => {}));
      const fetch = web({});

      const outcome = expect(
        scrape("https://slow.example.com/", { resolve, fetch }),
      ).rejects.toThrow(/timed out/);
      await vi.advanceTimersByTimeAsync(10_000);

      await outcome;
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  describe("response size cap", () => {
    const CAP = 2_000_000;
    const CHUNK = 64 * 1024;
    const url = "https://jobs.example.com/big";
    const resolve = dns({ "jobs.example.com": [PUBLIC_V4] });

    // A body of `count` chunks of the letter "a" that records how many were
    // pulled and whether the reader closed it.
    function meteredBody(count: number) {
      const meter = { pulled: 0, closed: false };
      async function* body(): AsyncGenerator<Uint8Array> {
        try {
          for (let i = 0; i < count; i++) {
            meter.pulled++;
            yield new Uint8Array(CHUNK).fill(0x61);
          }
        } finally {
          meter.closed = true;
        }
      }
      return { meter, body: body() };
    }
    // The cap is passed partway through chunk 31, so nothing after it is needed.
    const CHUNKS_TO_PASS_CAP = Math.floor(CAP / CHUNK) + 1;

    it("stops reading as soon as the body passes the cap", async () => {
      const { meter, body } = meteredBody(200);
      const fetch = web({ [url]: () => ({ status: 200, headers: {}, body }) });

      await expect(scrape(url, { resolve, fetch })).rejects.toThrow(/too large/);

      expect(meter.pulled).toBe(CHUNKS_TO_PASS_CAP);
      expect(meter.closed).toBe(true);
    });

    it("does not trust a small content-length", async () => {
      // For a compressed response Content-Length is the size on the wire, not
      // the size of the body the reader ends up with.
      const { meter, body } = meteredBody(200);
      const fetch = web({
        [url]: () => ({ status: 200, headers: { "content-length": "300" }, body }),
      });

      await expect(scrape(url, { resolve, fetch })).rejects.toThrow(/too large/);

      expect(meter.pulled).toBe(CHUNKS_TO_PASS_CAP);
      expect(meter.closed).toBe(true);
    });

    it("rejects a content-length over the cap without reading the body", async () => {
      const { meter, body } = meteredBody(200);
      const fetch = web({
        [url]: () => ({ status: 200, headers: { "content-length": String(CAP + 1) }, body }),
      });

      await expect(scrape(url, { resolve, fetch })).rejects.toThrow(/too large/);

      expect(meter.pulled).toBe(0);
    });

    it("applies the cap to the inflated size of a gzip body", async () => {
      // 64 MB of zeros is about 64 KB of gzip, far under the cap on the wire.
      const compressed = gzipSync(Buffer.alloc(64 * 1024 * 1024));
      expect(compressed.byteLength).toBeLessThan(CAP / 10);
      const wire = Readable.from([compressed], { objectMode: false });
      let inflated = 0;
      async function* body(): AsyncGenerator<Uint8Array> {
        for await (const chunk of decodeContent(wire, "gzip")) {
          inflated += chunk.byteLength;
          yield chunk;
        }
      }
      const fetch = web({
        [url]: () => ({
          status: 200,
          headers: { "content-length": String(compressed.byteLength) },
          body: body(),
        }),
      });

      await expect(scrape(url, { resolve, fetch })).rejects.toThrow(/too large/);

      // Inflating stopped within one zlib chunk of the cap and the compressed
      // source was closed, not drained.
      expect(inflated).toBeLessThanOrEqual(CAP + CHUNK);
      await vi.waitFor(() => expect(wire.destroyed).toBe(true));
    });

    it("counts bytes, not characters", async () => {
      // 700,000 euro signs (U+20AC) are 2.1 MB of UTF-8 but only 700,000 characters.
      const euro = new TextEncoder().encode(String.fromCodePoint(0x20ac).repeat(70_000));
      async function* body(): AsyncGenerator<Uint8Array> {
        for (let i = 0; i < 10; i++) yield euro;
      }
      const fetch = web({ [url]: () => ({ status: 200, headers: {}, body: body() }) });

      await expect(scrape(url, { resolve, fetch })).rejects.toThrow(/too large/);
    });

    it("accepts a body of exactly the cap", async () => {
      async function* body(): AsyncGenerator<Uint8Array> {
        yield new Uint8Array(CAP).fill(0x61);
      }
      const fetch = web({ [url]: () => ({ status: 200, headers: {}, body: body() }) });

      const result = await scrape(url, { resolve, fetch });

      expect(result.html.length).toBe(CAP);
    });

    it("decodes a character that is split across two chunks", async () => {
      async function* body(): AsyncGenerator<Uint8Array> {
        // "<p>caf", then the two UTF-8 bytes of e-acute (U+00E9) in separate chunks.
        yield new Uint8Array([0x3c, 0x70, 0x3e, 0x63, 0x61, 0x66, 0xc3]);
        yield new Uint8Array([0xa9, 0x3c, 0x2f, 0x70, 0x3e]);
      }
      const fetch = web({ [url]: () => ({ status: 200, headers: {}, body: body() }) });

      const result = await scrape(url, { resolve, fetch });

      expect(result.text).toBe(`caf${String.fromCodePoint(0xe9)}`);
    });
  });

  // tests/e2e/google-referral.spec.ts scrapes a fixture page served by the dev
  // server itself, so that one URL has to stay reachable outside production.
  describe("dev server fixture", () => {
    const fixture = "http://localhost:3000/api/test-mock/google-fixture";

    it("is reachable outside production", async () => {
      const resolve = dns({ localhost: ["::1", "127.0.0.1"] });
      const fetch = web({ [fixture]: () => page("<p>Fixture</p>") });

      const result = await scrape(fixture, { resolve, fetch });

      expect(result.text).toBe("Fixture");
      expect(fetch.mock.calls[0]?.[0].addresses).toEqual(["::1", "127.0.0.1"]);
    });

    it("is blocked in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const resolve = dns({ localhost: ["::1", "127.0.0.1"] });
      const fetch = web({});

      await expect(scrape(fixture, { resolve, fetch })).rejects.toThrow(/blocked address/);
      expect(fetch).not.toHaveBeenCalled();
    });

    it.each([
      "http://localhost:3000/api/applications",
      "http://localhost:3000/api/test-mock/../applications",
      "http://localhost:5432/api/test-mock/google-fixture",
      "http://127.0.0.1:3000/api/test-mock/google-fixture",
      "https://localhost:3000/api/test-mock/google-fixture",
    ])("does not cover %s", async (url) => {
      const resolve = dns({ localhost: ["::1", "127.0.0.1"] });
      const fetch = web({});

      await expect(scrape(url, { resolve, fetch })).rejects.toThrow(/blocked address/);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  // The tests above inject deps.fetch, so none of them runs the transport that
  // the route really uses. Here node:http and node:https request() are
  // replaced by spies that return a canned response, so the default transport
  // runs without opening a socket. DNS is still injected.
  describe("default transport", () => {
    interface Canned {
      statusCode: number;
      headers: Record<string, string>;
      body: Buffer;
    }

    function stubRequest(mod: typeof http | typeof https, respond: (url: URL) => Canned) {
      const impl = (
        url: URL,
        _options: http.RequestOptions,
        onResponse: (res: http.IncomingMessage) => void,
      ) => {
        const request = new EventEmitter() as unknown as http.ClientRequest;
        request.destroy = vi.fn(() => request);
        request.end = (() => {
          const { statusCode, headers, body } = respond(url);
          const res = Object.assign(Readable.from([body], { objectMode: false }), {
            statusCode,
            headers,
          });
          queueMicrotask(() => onResponse(res as unknown as http.IncomingMessage));
          return request;
        }) as http.ClientRequest["end"];
        return request;
      };
      return vi.spyOn(mod, "request").mockImplementation(impl as unknown as typeof http.request);
    }

    type Lookup = (
      hostname: string,
      options: { all?: boolean },
      callback: (err: Error | null, address: unknown, family?: number) => void,
    ) => void;

    // Restore only these spies: vi.restoreAllMocks would also clear the
    // recorded calls of globalFetch before the outer afterEach checks it.
    let spies: Array<{ mockRestore(): void }> = [];
    const track = <T extends { mockRestore(): void }>(spy: T): T => {
      spies.push(spy);
      return spy;
    };
    afterEach(() => {
      for (const spy of spies) spy.mockRestore();
      spies = [];
    });

    it("connects only to the addresses that were checked", async () => {
      const resolve = dns({ "jobs.example.com": [PUBLIC_V4, PUBLIC_V6] });
      const request = track(
        stubRequest(https, () => ({
          statusCode: 200,
          headers: {},
          body: Buffer.from("<p>Role</p>"),
        })),
      );

      const result = await scrape("https://jobs.example.com/role/1", { resolve });

      expect(result.text).toBe("Role");
      expect(request).toHaveBeenCalledTimes(1);
      const options = request.mock.calls[0]?.[1] as http.RequestOptions;
      expect(options.agent).toBe(false);
      const lookup = options.lookup as unknown as Lookup;
      expect(typeof lookup).toBe("function");
      // net.connect asks for every address (all: true) or for a single one.
      const all = await new Promise((done) =>
        lookup("jobs.example.com", { all: true }, (_err, list) => done(list)),
      );
      expect(all).toEqual([
        { address: PUBLIC_V4, family: 4 },
        { address: PUBLIC_V6, family: 6 },
      ]);
      const one = await new Promise((done) =>
        lookup("jobs.example.com", {}, (_err, address, family) => done([address, family])),
      );
      expect(one).toEqual([PUBLIC_V4, 4]);
    });

    it("does not follow a redirect to a blocked address", async () => {
      const resolve = dns({ "short.example.com": [PUBLIC_V4] });
      const secure = track(
        stubRequest(https, () => ({
          statusCode: 302,
          headers: { location: "http://127.0.0.1:8080/admin" },
          body: Buffer.alloc(0),
        })),
      );
      const plain = track(
        stubRequest(http, () => ({
          statusCode: 200,
          headers: {},
          body: Buffer.from("internal"),
        })),
      );

      await expect(scrape("https://short.example.com/r", { resolve })).rejects.toThrow(
        /blocked address/,
      );
      expect(secure).toHaveBeenCalledTimes(1);
      expect(plain).not.toHaveBeenCalled();
    });

    it("undoes gzip and applies the cap to the inflated bytes", async () => {
      const resolve = dns({ "jobs.example.com": [PUBLIC_V4] });
      const small = gzipSync("<p>Zipped</p>");
      const bomb = gzipSync(Buffer.alloc(16 * 1024 * 1024));
      track(
        stubRequest(http, (url) => ({
          statusCode: 200,
          headers: { "content-encoding": "gzip" },
          body: url.pathname === "/bomb" ? bomb : small,
        })),
      );

      await expect(scrape("http://jobs.example.com/ok", { resolve })).resolves.toMatchObject({
        text: "Zipped",
      });
      await expect(scrape("http://jobs.example.com/bomb", { resolve })).rejects.toThrow(
        /too large/,
      );
    });
  });
});
