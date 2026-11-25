import { describe, it, expect } from "vitest";
import {
  MAX_PROMPT_CHARS,
  buildCoverLetterRequest,
  buildResumeParseRequest,
  promptChars,
} from "./index";

const cached = {
  baseResumeText: "r".repeat(1000),
  skills: ["TypeScript"],
  targetRoles: ["Software Engineer"],
  toneGuidance: "Direct.",
};

describe("promptChars", () => {
  it("counts system blocks and string messages", () => {
    expect(
      promptChars({
        model: "m",
        max_tokens: 1,
        system: [{ type: "text", text: "abc" }],
        messages: [{ role: "user", content: "defgh" }],
      }),
    ).toBe(8);
  });

  it("counts a string system prompt and text blocks inside a message", () => {
    expect(
      promptChars({
        model: "m",
        max_tokens: 1,
        system: "ab",
        messages: [{ role: "user", content: [{ type: "text", text: "cde" }] }],
      }),
    ).toBe(5);
  });

  it("does not count an attached PDF", () => {
    const req = buildResumeParseRequest({ resumeBase64Pdf: "A".repeat(500_000) });
    expect(promptChars(req)).toBeLessThan(2000);
  });

  it("grows with every stored input a drafting prompt carries", () => {
    const base = { cached, jobPostingText: "p", company: "c", title: "t", variantEmphasis: ["k"] };
    const small = promptChars(buildCoverLetterRequest(base));
    expect(small).toBeLessThan(MAX_PROMPT_CHARS);
    const grown = [
      { ...base, jobPostingText: "p".repeat(MAX_PROMPT_CHARS) },
      { ...base, variantEmphasis: ["k".repeat(MAX_PROMPT_CHARS)] },
      { ...base, cached: { ...cached, targetRoles: ["r".repeat(MAX_PROMPT_CHARS)] } },
      { ...base, cached: { ...cached, baseResumeText: "r".repeat(MAX_PROMPT_CHARS) } },
    ];
    for (const inputs of grown) {
      expect(promptChars(buildCoverLetterRequest(inputs))).toBeGreaterThan(MAX_PROMPT_CHARS);
    }
  });
});
