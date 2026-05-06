import { describe, it, expect, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { AnimatedNumber } from "./animated-number";

describe("AnimatedNumber", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("renders the target value without animating on subsequent loads (flag set)", async () => {
    sessionStorage.setItem("jobcopilot:dashboard_seen", "1");
    const { container } = render(<AnimatedNumber value={42} flagKey="jobcopilot:dashboard_seen" />);
    await waitFor(() => expect(container.textContent).toBe("42"));
  });

  it("animates from 0 on first load and sets the flag", () => {
    expect(sessionStorage.getItem("jobcopilot:dashboard_seen")).toBeNull();
    const { container } = render(<AnimatedNumber value={42} flagKey="jobcopilot:dashboard_seen" />);
    expect(container.textContent).toBe("0");
    expect(sessionStorage.getItem("jobcopilot:dashboard_seen")).toBe("1");
  });

  it("renders the integer value at the end of the animation duration", async () => {
    const { container } = render(<AnimatedNumber value={42} flagKey="test:key" durationMs={300} />);
    expect(container.textContent).toBe("0");
    await new Promise((r) => setTimeout(r, 400));
    expect(container.textContent).toBe("42");
  });
});
