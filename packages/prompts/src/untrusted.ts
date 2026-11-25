/**
 * Wraps text that came from a third-party page, or that a model extracted
 * from one, in a named tag. The prompts tell the model that text inside the
 * tag is data and never instructions.
 *
 * Every "<" that starts a copy of the tag (an opening or closing tag, with
 * any whitespace or slashes before the name) is turned into "&lt;" in one
 * pass. Nothing is deleted, so no characters can be joined into a new copy
 * of the tag by the replacement, and the text cannot close the block early.
 * The pattern is a single lookahead with one character class, so it runs in
 * linear time even on long runs of whitespace.
 */
export function wrapUntrusted(tag: string, text: string): string {
  const startOfTagCopy = new RegExp(`<(?=[\\s/]*${tag}\\b)`, "gi");
  return `<${tag}>\n${text.replace(startOfTagCopy, "&lt;")}\n</${tag}>`;
}
