import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { DriftOrb } from "./drift-orb";

// Stand-in for the hashed names a real CSS module build emits.
vi.mock("./marketing.module.css", () => ({
  default: { driftOrb: "m_driftOrb", drift1: "m_drift1_HASH", drift2: "m_drift2_HASH" },
}));

describe("DriftOrb", () => {
  it("renders an aria-hidden div with configured size and color", () => {
    const { container } = render(
      <DriftOrb size={600} color="violet" opacity={0.35} top="-200px" right="-150px" duration="28s" animationName="drift1" />,
    );
    const orb = container.firstChild as HTMLElement;
    expect(orb.getAttribute("aria-hidden")).toBe("true");
    expect(orb.style.width).toBe("600px");
    expect(orb.style.height).toBe("600px");
    expect(orb.style.opacity).toBe("0.35");
    expect(orb.style.top).toBe("-200px");
    expect(orb.style.right).toBe("-150px");
    expect(orb.style.animation).toContain("28s");
    expect(orb.style.animation).toContain("m_drift1_HASH");
  });

  it("references the module-scoped keyframe name, not the raw one", () => {
    const { container } = render(<DriftOrb size={400} color="azure" opacity={0.2} animationName="drift2" duration="22s" />);
    const orb = container.firstChild as HTMLElement;
    expect(orb.style.animation).toContain("m_drift2_HASH");
    expect(orb.style.animation).not.toMatch(/(^|\s)drift2(\s|$)/);
  });

  it("uses the brand violet HSL when color='violet'", () => {
    const { container } = render(<DriftOrb size={400} color="violet" opacity={0.2} animationName="drift1" duration="24s" />);
    const orb = container.firstChild as HTMLElement;
    expect(orb.style.background).toContain("258");
  });

  it("uses the brand azure HSL when color='azure'", () => {
    const { container } = render(<DriftOrb size={400} color="azure" opacity={0.2} animationName="drift2" duration="22s" />);
    const orb = container.firstChild as HTMLElement;
    expect(orb.style.background).toContain("215");
  });
});
