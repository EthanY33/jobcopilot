import { describe, it, expect } from "vitest";
import { parseCoverLetterResponse } from "./cover-letter";

describe("parseCoverLetterResponse", () => {
  it("extracts JSON from text block", () => {
    const msg = {
      content: [
        {
          type: "text" as const,
          text: '{"body":"Dear Google team...","alternateOpenings":["a","b","c"]}',
        },
      ],
    } as any;
    const r = parseCoverLetterResponse(msg);
    expect(r.body).toContain("Google");
    expect(r.alternateOpenings).toHaveLength(3);
  });

  it("handles preamble before JSON", () => {
    const msg = {
      content: [
        { type: "text" as const, text: 'Here you go:\n{"body":"Hi","alternateOpenings":["x","y","z"]}' },
      ],
    } as any;
    const r = parseCoverLetterResponse(msg);
    expect(r.body).toBe("Hi");
  });

  it("throws on missing alternateOpenings length", () => {
    const msg = {
      content: [{ type: "text" as const, text: '{"body":"Hi","alternateOpenings":["x"]}' }],
    } as any;
    expect(() => parseCoverLetterResponse(msg)).toThrow(/3/);
  });
});
