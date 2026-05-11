import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { HeroDemo } from "./hero-demo";

describe("HeroDemo tab cycle", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("starts on Cover Letter with the matching status label", () => {
    const { getByText, queryByText } = render(<HeroDemo />);
    expect(getByText("DRAFTING COVER LETTER")).toBeTruthy();
    expect(queryByText("Resume bullets · tailored to posting")).toBeNull();
  });

  it("advances to Resume after 4.5s and updates the status label", () => {
    const { getByText, queryByText } = render(<HeroDemo />);
    act(() => { vi.advanceTimersByTime(4500); });
    expect(getByText("TAILORING RESUME BULLETS")).toBeTruthy();
    expect(getByText("Resume bullets · tailored to posting")).toBeTruthy();
    expect(queryByText("DRAFTING COVER LETTER")).toBeNull();
  });

  it("advances to Answers after another 4.5s", () => {
    const { getByText } = render(<HeroDemo />);
    act(() => { vi.advanceTimersByTime(4500); }); // Resume
    act(() => { vi.advanceTimersByTime(4500); }); // Answers
    expect(getByText("ANSWERING FREE TEXT QUESTIONS")).toBeTruthy();
  });

  it("loops back to Cover Letter after Answers", () => {
    const { getByText } = render(<HeroDemo />);
    act(() => { vi.advanceTimersByTime(4500 * 3); });
    expect(getByText("DRAFTING COVER LETTER")).toBeTruthy();
  });
});
