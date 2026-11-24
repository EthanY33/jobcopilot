import { describe, it, expect } from "vitest";
import { detectAts, htmlToText } from "@/lib/scraper";

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
    expect(htmlToText("İİİ<script>drop()</script>ok")).toBe("İİİ ok");
  });
  it("drops an unclosed script or style block through the end of input", () => {
    expect(htmlToText("<p>Keep</p><script>alert(1)")).toBe("Keep");
    expect(htmlToText("<p>Keep</p><style>.x{color:red}")).toBe("Keep");
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
    expect(htmlToText("<script".repeat(REPEATS))).toBe("");
  }, 10_000);
  it("handles a page of unclosed style openers in one pass", () => {
    expect(htmlToText("<style".repeat(REPEATS))).toBe("");
  }, 10_000);
  it("handles a page of unclosed tag openers in one pass", () => {
    const input = "<a".repeat(REPEATS);
    expect(htmlToText(input) === input).toBe(true);
  }, 10_000);
});
