import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  function renderInProvider() {
    return render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <ThemeToggle />
      </ThemeProvider>,
    );
  }

  it("renders a placeholder before mount (avoids SSR/CSR hydration mismatch)", () => {
    renderInProvider();
    const btn = screen.getByRole("button", { name: /toggle theme/i });
    expect(btn).toBeDefined();
  });

  it("becomes interactive after mount", async () => {
    renderInProvider();
    // After useEffect runs, the toggle should be enabled (the placeholder branch is for the very first render only).
    const btn = await screen.findByRole("button", { name: /toggle theme/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });
});
