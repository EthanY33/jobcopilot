import type Anthropic from "@anthropic-ai/sdk";
import { buildCachedPrefix, type CachedPrefixInputs } from "./cache";
import { extractJson } from "./extract-json";

export interface CoverLetterInputs {
  cached: CachedPrefixInputs;
  jobPostingText: string;
  company: string;
  title: string;
  variantEmphasis: string[];
  override?: string;
}

export interface CoverLetterOutput {
  body: string;
  alternateOpenings: string[];
}

export function buildCoverLetterRequest(
  inputs: CoverLetterInputs,
): Anthropic.Messages.MessageCreateParamsNonStreaming {
  const variable = [
    `Target role: ${inputs.title} at ${inputs.company}`,
    "",
    "Job posting:",
    inputs.jobPostingText,
    "",
    inputs.variantEmphasis.length > 0
      ? `Emphasis keywords: ${inputs.variantEmphasis.join(", ")}`
      : "",
    inputs.override ? `User note: ${inputs.override}` : "",
    "",
    "Write a 220-280 word cover letter (three paragraphs) that feels like it was written by the candidate.",
    "Return JSON ONLY in this exact shape:",
    '{"body": string, "alternateOpenings": [string, string, string]}',
    "Where body is the full letter and alternateOpenings are three distinct first-sentence variants.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    temperature: 0.7,
    system: buildCachedPrefix(inputs.cached),
    messages: [{ role: "user", content: variable }],
  };
}

export function parseCoverLetterResponse(
  response: Anthropic.Messages.Message,
): CoverLetterOutput {
  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = JSON.parse(extractJson(text)) as CoverLetterOutput;
  if (typeof parsed.body !== "string") throw new Error("Invalid cover letter body");
  if (!Array.isArray(parsed.alternateOpenings) || parsed.alternateOpenings.length !== 3) {
    throw new Error("Expected 3 alternateOpenings");
  }
  if (!parsed.alternateOpenings.every((s) => typeof s === "string")) {
    throw new Error("alternateOpenings must be strings");
  }
  return parsed;
}
