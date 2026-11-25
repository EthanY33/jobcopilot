import type Anthropic from "@anthropic-ai/sdk";

/** The reply stopped at max_tokens, so its JSON is cut off. Retrying the same request fails the same way. */
export class TruncatedResponseError extends Error {
  constructor() {
    super("Claude response was cut off at max_tokens");
    this.name = "TruncatedResponseError";
  }
}

/** The model declined to answer, so there is no JSON to read. */
export class RefusedResponseError extends Error {
  constructor() {
    super("Claude refused the request");
    this.name = "RefusedResponseError";
  }
}

/**
 * Every parser calls this before it reads the text, so a reply that did not
 * finish is reported as what it is instead of as a JSON syntax error.
 */
export function assertCompleteResponse(response: Anthropic.Messages.Message): void {
  if (response.stop_reason === "max_tokens") throw new TruncatedResponseError();
  if (response.stop_reason === "refusal") throw new RefusedResponseError();
}
