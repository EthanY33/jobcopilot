import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FinalCTASection } from "./final-cta-section";

describe("FinalCTASection (locked copy)", () => {
  it("renders the H2 with the locked text exactly", () => {
    const { getByRole } = render(<FinalCTASection />);
    const h2 = getByRole("heading", { level: 2 });
    expect(h2.textContent).toBe("Ready to stop writing applications?");
  });

  it("renders the sub copy verbatim", () => {
    const { getByText } = render(<FinalCTASection />);
    expect(
      getByText("Try the demo. Or read the source. Free forever, runs on your Anthropic key, no marketing email."),
    ).toBeTruthy();
  });

  it("renders both CTAs with correct hrefs", () => {
    const { getByText } = render(<FinalCTASection />);
    const primary = getByText(/Try the demo →/).closest("a");
    expect(primary?.getAttribute("href")).toBe("/login");
    const ghost = getByText(/Star on GitHub/).closest("a");
    expect(ghost?.getAttribute("href")).toBe("https://github.com/EthanY33/jobcopilot");
  });

  it("renders the fineprint", () => {
    const { getByText } = render(<FinalCTASection />);
    expect(getByText("Open source · MIT · v1.0")).toBeTruthy();
  });
});
