import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { ScrollReveal } from "./scroll-reveal";

type IntersectionCallback = (entries: { isIntersecting: boolean }[]) => void;

let lastObserver: { callback: IntersectionCallback; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> } | null = null;

beforeEach(() => {
  lastObserver = null;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      callback: IntersectionCallback;
      observe = vi.fn();
      disconnect = vi.fn();
      constructor(cb: IntersectionCallback) {
        this.callback = cb;
        lastObserver = this; // eslint-disable-line @typescript-eslint/no-this-alias
      }
      unobserve = vi.fn();
      takeRecords = () => [];
      root = null;
      rootMargin = "";
      thresholds = [];
    },
  );
});

describe("ScrollReveal", () => {
  it("starts hidden and becomes visible when intersection fires", () => {
    const { container } = render(
      <ScrollReveal>
        <p>visible-content</p>
      </ScrollReveal>,
    );
    const node = container.firstChild as HTMLElement;
    expect(node.className).not.toContain("revealVisible");
    expect(node.textContent).toBe("visible-content");

    act(() => {
      lastObserver!.callback([{ isIntersecting: true }]);
    });

    expect(node.className).toContain("revealVisible");
  });

  it("applies a transition delay when delayMs is provided", () => {
    const { container } = render(
      <ScrollReveal delayMs={300}>
        <p>delayed</p>
      </ScrollReveal>,
    );
    const node = container.firstChild as HTMLElement;
    expect(node.style.transitionDelay).toBe("300ms");
  });
});
