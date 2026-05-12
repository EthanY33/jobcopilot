import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { HeroSection } from "./hero-section";

describe("HeroSection (locked copy)", () => {
  it("renders the locked eyebrow verbatim", () => {
    const { getByText } = render(<HeroSection />);
    expect(getByText("A personal tool. Open source. Free.")).toBeTruthy();
  });

  it("renders the H1 with both lines", () => {
    const { getByText } = render(<HeroSection />);
    expect(getByText("Stop writing")).toBeTruthy();
    expect(getByText("applications.")).toBeTruthy();
  });

  it("renders the lede with the three mono pills", () => {
    const { getByText } = render(<HeroSection />);
    expect(getByText("cover letter")).toBeTruthy();
    expect(getByText("resume bullets")).toBeTruthy();
    expect(getByText("free text question")).toBeTruthy();
  });

  it("renders both CTAs", () => {
    const { getByText } = render(<HeroSection />);
    expect(getByText(/Try the demo/)).toBeTruthy();
    expect(getByText(/Star on GitHub/)).toBeTruthy();
  });

  it("the primary CTA links to /login", () => {
    const { getByText } = render(<HeroSection />);
    const primary = getByText(/Try the demo/).closest("a");
    expect(primary?.getAttribute("href")).toBe("/login");
  });

  it("the ghost CTA links to the GitHub repo", () => {
    const { getByText } = render(<HeroSection />);
    const ghost = getByText(/Star on GitHub/).closest("a");
    expect(ghost?.getAttribute("href")).toBe("https://github.com/EthanY33/jobcopilot");
  });
});
