import type Anthropic from "@anthropic-ai/sdk";

export interface CachedPrefixInputs {
  baseResumeText: string;
  skills: string[];
  targetRoles: string[];
  toneGuidance: string;
}

/**
 * Builds the cached prefix for Claude prompts. Every drafting call on this
 * user should share this prefix so the cache hits.
 */
export function buildCachedPrefix(
  inputs: CachedPrefixInputs,
): Anthropic.Messages.TextBlockParam[] {
  const text = [
    "You are a career writing assistant for an engineering job seeker.",
    "",
    "Tone guidance:",
    inputs.toneGuidance,
    "",
    "Anti-patterns to avoid:",
    "- Buzzword salad ('synergy', 'paradigm', 'passionate about')",
    "- Filler openings ('I am writing to apply for...')",
    "- Over-explaining known concepts",
    "",
    "Candidate base resume:",
    inputs.baseResumeText,
    "",
    "Candidate skills:",
    inputs.skills.join(", "),
    "",
    "Target roles:",
    inputs.targetRoles.join(", "),
  ].join("\n");

  return [
    {
      type: "text",
      text,
      cache_control: { type: "ephemeral" },
    },
  ];
}
