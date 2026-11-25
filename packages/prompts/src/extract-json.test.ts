import { describe, it, expect } from "vitest";
import { extractJson } from "./extract-json";

const LETTER = '{"body":"Hi {Company} team","alternateOpenings":["a","b","c"]}';

describe("extractJson", () => {
  it("returns a bare JSON object unchanged", () => {
    expect(extractJson(`  ${LETTER}\n`)).toBe(LETTER);
  });

  it("skips a preamble", () => {
    expect(extractJson(`Here you go:\n${LETTER}`)).toBe(LETTER);
  });

  it("reads a fenced block", () => {
    expect(extractJson("```json\n" + LETTER + "\n```")).toBe(LETTER);
  });

  it("ignores trailing text that contains braces", () => {
    const text = `${LETTER}\n\nNote: replace {Company} before sending.`;
    expect(extractJson(text)).toBe(LETTER);
  });

  it("ignores a preamble that contains braces", () => {
    const text = `Fill in the {placeholders} first.\n${LETTER}`;
    expect(extractJson(text)).toBe(LETTER);
  });

  it("ignores a preamble with an unclosed brace", () => {
    const text = `The object opens with { as usual:\n${LETTER}`;
    expect(extractJson(text)).toBe(LETTER);
  });

  it("is not confused by braces and escaped quotes inside strings", () => {
    const tricky = '{"body":"a } b \\" { c","alternateOpenings":["{","}","x"]}';
    expect(extractJson(`Sure. ${tricky} Done {ok}.`)).toBe(tricky);
  });

  it("throws when there is no JSON object", () => {
    expect(() => extractJson("I cannot help with that.")).toThrow("No JSON object in response");
  });

  it("throws on an object that was cut off", () => {
    expect(() => extractJson('{"body":"Dear team, I am wri')).toThrow("No JSON object in response");
  });

  it("gives up on input that is nothing but opening braces", () => {
    expect(() => extractJson("{".repeat(20000))).toThrow("No JSON object in response");
  });
});
