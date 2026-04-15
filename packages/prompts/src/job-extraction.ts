import type Anthropic from "@anthropic-ai/sdk";
import type { ExtractedJobPosting, AtsSource } from "@jobcopilot/shared";

export interface JobExtractionInputs {
  url: string;
  pageText: string;
  detectedAts: AtsSource;
}

export function buildJobExtractionRequest(
  inputs: JobExtractionInputs,
): Anthropic.Messages.MessageCreateParamsNonStreaming {
  const variable = [
    `Source URL: ${inputs.url}`,
    `Detected ATS: ${inputs.detectedAts}`,
    "",
    "Page text:",
    inputs.pageText.slice(0, 12000),
    "",
    "Extract the job posting data. Return JSON ONLY in this exact shape:",
    '{"company":string,"title":string,"location":string|null,"requirements":string[],"description":string,"sourceAts":"' +
      inputs.detectedAts +
      '"}',
    "Requirements should be the hard qualifications as a list of concise bullet phrases.",
    "Description should be a 1-2 paragraph summary of the role, not the full page.",
  ].join("\n");

  return {
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    temperature: 0.2,
    system: [
      {
        type: "text",
        text: "You extract structured job posting data from raw page text. Output strict JSON.",
      },
    ],
    messages: [{ role: "user", content: variable }],
  };
}

export function parseJobExtractionResponse(
  response: Anthropic.Messages.Message,
): ExtractedJobPosting {
  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  return JSON.parse(text.slice(first, last + 1)) as ExtractedJobPosting;
}
