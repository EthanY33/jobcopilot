import { describe, it, expect } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { useMouseParallax } from "./use-mouse-parallax";

function Probe() {
  const { transform, handlers } = useMouseParallax();
  return (
    <div data-testid="frame" style={{ transform }} {...handlers}>
      content
    </div>
  );
}

describe("useMouseParallax", () => {
  it("returns 'none' before any mouse event", () => {
    const { getByTestId } = render(<Probe />);
    const node = getByTestId("frame") as HTMLElement;
    expect(node.style.transform === "" || node.style.transform === "none").toBe(true);
  });

  it("returns a rotateX/rotateY transform after mouse move", () => {
    const { getByTestId } = render(<Probe />);
    const node = getByTestId("frame") as HTMLElement;

    Object.defineProperty(node, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON() {} }),
      configurable: true,
    });

    act(() => {
      fireEvent.mouseMove(node, { clientX: 75, clientY: 25 });
    });

    expect(node.style.transform).toMatch(/rotateX\(-?\d+\.\d{2}deg\)/);
    expect(node.style.transform).toMatch(/rotateY\(-?\d+\.\d{2}deg\)/);
  });

  it("resets to none on mouse leave", () => {
    const { getByTestId } = render(<Probe />);
    const node = getByTestId("frame") as HTMLElement;
    Object.defineProperty(node, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON() {} }),
      configurable: true,
    });

    act(() => {
      fireEvent.mouseMove(node, { clientX: 75, clientY: 25 });
    });
    expect(node.style.transform).not.toBe("none");

    act(() => {
      fireEvent.mouseLeave(node);
    });
    expect(node.style.transform === "none" || node.style.transform === "").toBe(true);
  });
});
