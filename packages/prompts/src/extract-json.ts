/**
 * Extracts the outermost JSON object from a text block. Tries a strict parse
 * first (covers the "Return JSON ONLY" happy path), then falls back to
 * slicing between the first `{` and last `}` to tolerate model preambles.
 * Throws a descriptive error if no JSON object is present.
 */
export function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("No JSON object in response");
  }
  return text.slice(firstBrace, lastBrace + 1);
}
