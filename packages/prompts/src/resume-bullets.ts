import type Anthropic from "@anthropic-ai/sdk";
import { buildCachedPrefix, type CachedPrefixInputs } from "./cache";
import type { ResumeSection } from "@jobcopilot/shared";
import { extractJson } from "./extract-json";

export interface SuggestBulletsInputs {
  cached: CachedPrefixInputs;
  sections: ResumeSection[];
  jobPostingText: string;
  company: string;
  title: string;
  emphasisKeywords: string[];
}

export interface BulletSuggestion {
  section: string;
  originalBullet: string;
  suggestedBullet: string;
  rationale: string;
}

export function buildSuggestBulletsRequest(
  inputs: SuggestBulletsInputs,
): Anthropic.Messages.MessageCreateParamsNonStreaming {
  const bulletList = inputs.sections
    .flatMap((s) => s.items.map((item) => ({ section: s.section, item })))
    .map((b, i) => `[${i}] [${b.section}] ${b.item}`)
    .join("\n");

  const variable = [
    `Target role: ${inputs.title} at ${inputs.company}`,
    "",
    "Job posting:",
    inputs.jobPostingText,
    "",
    `Emphasis: ${inputs.emphasisKeywords.join(", ")}`,
    "",
    "Candidate resume bullets (indexed):",
    bulletList,
    "",
    "For each bullet, propose a role-tailored rewrite. Preserve truthfulness — do NOT invent achievements. Only adjust phrasing, emphasis, and keyword alignment.",
    "Return JSON ONLY in this exact shape:",
    '{"suggestions":[{"section":string,"originalBullet":string,"suggestedBullet":string,"rationale":string}]}',
  ].join("\n");

  return {
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    temperature: 0.3,
    system: buildCachedPrefix(inputs.cached),
    messages: [{ role: "user", content: variable }],
  };
}

export function parseBulletSuggestionsResponse(
  response: Anthropic.Messages.Message,
): BulletSuggestion[] {
  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = JSON.parse(extractJson(text)) as { suggestions: BulletSuggestion[] };
  if (!Array.isArray(parsed.suggestions)) throw new Error("Expected suggestions array");
  if (
    !parsed.suggestions.every(
      (s) =>
        s !== null &&
        typeof s === "object" &&
        typeof (s as BulletSuggestion).section === "string" &&
        typeof (s as BulletSuggestion).originalBullet === "string" &&
        typeof (s as BulletSuggestion).suggestedBullet === "string" &&
        typeof (s as BulletSuggestion).rationale === "string",
    )
  ) {
    throw new Error("parseBulletSuggestionsResponse: invalid suggestion shape");
  }
  return parsed.suggestions;
}
