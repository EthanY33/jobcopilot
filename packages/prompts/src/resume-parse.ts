import type Anthropic from "@anthropic-ai/sdk";

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
  // The `document` content block (for PDF upload) is supported by the Claude
  // API but is not typed in @anthropic-ai/sdk@0.30.x. The cast is scoped here;
  // all callers receive a correctly-shaped MessageCreateParamsNonStreaming.
  return {
    model: "claude-sonnet-4-6",
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
        ] as unknown as Anthropic.Messages.MessageParam["content"],
      },
    ],
  };
}

export function parseResumeResponse(response: Anthropic.Messages.Message): ParsedResume {
  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  return JSON.parse(text.slice(first, last + 1)) as ParsedResume;
}
