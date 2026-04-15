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
});
