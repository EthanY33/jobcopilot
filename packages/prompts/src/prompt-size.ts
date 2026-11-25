import type Anthropic from "@anthropic-ai/sdk";

/**
 * Most text one drafting request may carry (system blocks plus messages).
 * A real request is a resume, one posting and one variant: about 50,000
 * characters at the very most. The profile, variant and posting are read from
 * the database, where nothing bounds their size, so callers check the built
 * request against this before they pay for it.
 */
export const MAX_PROMPT_CHARS = 100_000;

/** Characters of text in a request. Attached documents are not counted. */
export function promptChars(request: Anthropic.Messages.MessageCreateParamsNonStreaming): number {
  let total = 0;
  if (typeof request.system === "string") {
    total += request.system.length;
  } else if (request.system) {
    for (const block of request.system) total += block.text.length;
  }
  for (const message of request.messages) {
    if (typeof message.content === "string") {
      total += message.content.length;
    } else {
      for (const block of message.content) {
        if (block.type === "text") total += block.text.length;
      }
    }
  }
  return total;
}
