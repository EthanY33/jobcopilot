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
 *
 * Uses PromptCachingBetaTextBlockParam because cache_control is not on the
 * base TextBlockParam in SDK 0.30.x — it lives in the beta prompt-caching
 * namespace. Callers pass the result as the `system` field via the beta
 * messages endpoint (client.beta.promptCaching.messages.create) or cast for
 * the standard endpoint where the API accepts it but the SDK types don't
 * express it.
 */
export function buildCachedPrefix(
  inputs: CachedPrefixInputs,
): Anthropic.Beta.PromptCaching.PromptCachingBetaTextBlockParam[] {
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
