import type Anthropic from "@anthropic-ai/sdk";
import { extractJson } from "./extract-json";
import { assertCompleteResponse } from "./response";

export interface ParseResumeInputs {
  resumeBase64Pdf: string;
}

export interface ParsedResume {
  baseResumeText: string;
  skills: string[];
  sections: { section: string; items: string[] }[];
}

export function buildResumeParseRequest(
  inputs: ParseResumeInputs,
): Anthropic.Messages.MessageCreateParamsNonStreaming {
  return {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    temperature: 0.1,
    system: [
      {
        type: "text",
        text: "You parse resume PDFs into clean structured data. Output strict JSON.",
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: inputs.resumeBase64Pdf,
            },
          },
          {
            type: "text",
            text: [
              "Extract the resume.",
              "Return JSON ONLY in this exact shape:",
              '{"baseResumeText":string,"skills":string[],"sections":[{"section":string,"items":string[]}]}',
              "baseResumeText = the full plain text of the resume (headers + bullets, clean Unicode, one blank line between sections)",
              "skills = deduped list of technologies/skills mentioned",
              "sections = array of { section, items } where items are the raw bullet strings under that section (Experience role entries, Projects, Leadership, etc.)",
            ].join("\n"),
          },
        ],
      },
    ],
  };
}

export function parseResumeResponse(response: Anthropic.Messages.Message): ParsedResume {
  assertCompleteResponse(response);
  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = JSON.parse(extractJson(text)) as Partial<ParsedResume>;
  if (typeof parsed.baseResumeText !== "string") {
    throw new Error("parseResumeResponse: missing baseResumeText");
  }
  if (!Array.isArray(parsed.skills) || !parsed.skills.every((s) => typeof s === "string")) {
    throw new Error("parseResumeResponse: skills must be string[]");
  }
  if (
    !Array.isArray(parsed.sections) ||
    !parsed.sections.every(
      (sec) =>
        sec !== null &&
        typeof sec === "object" &&
        typeof (sec as { section: unknown }).section === "string" &&
        Array.isArray((sec as { items: unknown }).items) &&
        (sec as { items: unknown[] }).items.every((it) => typeof it === "string"),
    )
  ) {
    throw new Error("parseResumeResponse: invalid sections shape");
  }
  return parsed as ParsedResume;
}
