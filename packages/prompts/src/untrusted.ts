/**
 * Wraps text that came from a third-party page, or that a model extracted
 * from one, in a named tag. The prompts tell the model that text inside the
 * tag is data and never instructions.
 *
 * Any copy of the tag inside the text is replaced with a space first.
 * Otherwise the text could close the block early and carry on as if it were
 * part of the prompt. A space, not an empty string, so that two halves of a
 * tag cannot join into a new one.
 */
export function wrapUntrusted(tag: string, text: string): string {
  const anyCopyOfTag = new RegExp(`<\\s*/?\\s*${tag}\\b[^>]*>`, "gi");
  return `<${tag}>\n${text.replace(anyCopyOfTag, " ")}\n</${tag}>`;
}
