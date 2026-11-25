import { describe, it, expect } from "vitest";
import {
  RefusedResponseError,
  TruncatedResponseError,
  buildSuggestBulletsRequest,
  MAX_SUGGEST_BULLETS,
  parseBulletSuggestionsResponse,
  parseCoverLetterResponse,
  parseJobExtractionResponse,
  parseResumeResponse,
} from "./index";

function reply(text: string, stopReason: string): any {
  return { content: [{ type: "text", text }], stop_reason: stopReason };
}

const COVER_LETTER = '{"body":"Hi","alternateOpenings":["x","y","z"]}';
const SUGGESTIONS =
  '{"suggestions":[{"section":"Experience","originalBullet":"a","suggestedBullet":"b","rationale":"c"}]}';
const POSTING =
  '{"company":"Acme","title":"Engineer","location":null,"requirements":["TS"],"description":"Build.","sourceAts":"manual"}';
const RESUME = '{"baseResumeText":"Resume","skills":["TS"],"sections":[{"section":"Experience","items":["a"]}]}';

const parsers = [
  { name: "parseCoverLetterResponse", parse: parseCoverLetterResponse, good: COVER_LETTER },
  { name: "parseBulletSuggestionsResponse", parse: parseBulletSuggestionsResponse, good: SUGGESTIONS },
  { name: "parseJobExtractionResponse", parse: parseJobExtractionResponse, good: POSTING },
  { name: "parseResumeResponse", parse: parseResumeResponse, good: RESUME },
] as const;

describe.each(parsers)("$name stop_reason handling", ({ parse, good }) => {
  it("parses a finished reply", () => {
    expect(() => parse(reply(good, "end_turn"))).not.toThrow();
  });

  it("throws TruncatedResponseError when the reply was cut off mid-JSON", () => {
    const cut = good.slice(0, Math.floor(good.length / 2));
    expect(() => parse(reply(cut, "max_tokens"))).toThrow(TruncatedResponseError);
  });

  it("throws TruncatedResponseError even when the cut text happens to parse", () => {
    expect(() => parse(reply(good, "max_tokens"))).toThrow(TruncatedResponseError);
  });

  it("throws RefusedResponseError on a refusal", () => {
    expect(() => parse(reply("", "refusal"))).toThrow(RefusedResponseError);
  });
});

describe("parsers tolerate text around the JSON", () => {
  it("cover letter followed by a note with braces", () => {
    const text = `${COVER_LETTER}\n\nNote: replace {Company} before sending.`;
    expect(parseCoverLetterResponse(reply(text, "end_turn")).body).toBe("Hi");
  });

  it("bullet suggestions after a preamble with braces", () => {
    const text = `Rewrites for {role}:\n${SUGGESTIONS}`;
    expect(parseBulletSuggestionsResponse(reply(text, "end_turn"))).toHaveLength(1);
  });
});

describe("buildSuggestBulletsRequest output budget", () => {
  it("leaves room for a rewrite of every bullet up to the cap", () => {
    const req = buildSuggestBulletsRequest({
      cached: { baseResumeText: "r", skills: [], targetRoles: [], toneGuidance: "t" },
      sections: [{ section: "Experience", items: ["Built X"] }],
      jobPostingText: "p",
      company: "Acme",
      title: "Engineer",
      emphasisKeywords: [],
    });
    // A suggestion repeats the original bullet and adds a rewrite and a
    // rationale: roughly 130 to 200 output tokens each.
    expect(req.max_tokens).toBeGreaterThanOrEqual(MAX_SUGGEST_BULLETS * 200);
  });
});
