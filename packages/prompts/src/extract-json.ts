// A reply holds one JSON object, so a few candidates is plenty. The limit
// keeps a reply made of thousands of stray braces from being rescanned once
// per brace.
const MAX_CANDIDATES = 50;

/**
 * Extracts the JSON object from a text block. Tries a strict parse first
 * (covers the "Return JSON ONLY" happy path). Otherwise it walks the text and
 * returns the first balanced `{...}` span that parses as a JSON object, so
 * braces in a preamble or in a note after the JSON do not break the result.
 * Throws a descriptive error if no JSON object is present.
 */
export function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}") && isJsonObject(trimmed)) {
    return trimmed;
  }
  let start = text.indexOf("{");
  for (let tried = 0; start !== -1 && tried < MAX_CANDIDATES; tried++) {
    const end = matchingBrace(text, start);
    if (end !== -1) {
      const candidate = text.slice(start, end + 1);
      if (isJsonObject(candidate)) return candidate;
    }
    start = text.indexOf("{", start + 1);
  }
  throw new Error("No JSON object in response");
}

function isJsonObject(candidate: string): boolean {
  try {
    const value: unknown = JSON.parse(candidate);
    return typeof value === "object" && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

/** Index of the `}` that closes the `{` at `start`, skipping braces inside strings, or -1. */
function matchingBrace(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
