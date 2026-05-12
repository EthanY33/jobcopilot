import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ManifestoSection } from "./manifesto-section";

describe("ManifestoSection (locked copy)", () => {
  it("renders the H2 with gradient clause", () => {
    const { getByText } = render(<ManifestoSection />);
    expect(getByText("I built this")).toBeTruthy();
    expect(getByText("for myself.")).toBeTruthy();
  });

  it("renders all three paragraphs verbatim", () => {
    const { getByText } = render(<ManifestoSection />);
    expect(
      getByText(/Job applications take hours/, { exact: false }),
    ).toBeTruthy();
    expect(getByText(/So I built JobCopilot/, { exact: false })).toBeTruthy();
    expect(getByText(/Claude does the writing/, { exact: false })).toBeTruthy();
    expect(getByText(/The whole thing runs on free tiers/, { exact: false })).toBeTruthy();
  });

  it("renders all four specs", () => {
    const { getByText } = render(<ManifestoSection />);
    expect(getByText("Next.js + Claude")).toBeTruthy();
    expect(getByText("Under $5/mo")).toBeTruthy();
    expect(getByText("MIT")).toBeTruthy();
    expect(getByText("Personal use")).toBeTruthy();
  });

  it("renders the author byline with plain ASCII name", () => {
    const { getByText } = render(<ManifestoSection />);
    expect(getByText("Ethan Yucetepe")).toBeTruthy();
    expect(getByText(/@EthanY33/)).toBeTruthy();
  });
});
