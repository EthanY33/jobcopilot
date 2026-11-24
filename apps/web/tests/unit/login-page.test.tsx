import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabase: () => ({ auth: { signInWithOAuth: vi.fn() } }),
}));

import LoginPage from "@/app/(auth)/login/page";

describe("LoginPage error message", () => {
  it("shows no alert without an error parameter", () => {
    render(<LoginPage searchParams={{}} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("tells the user when sign-in did not complete", () => {
    render(<LoginPage searchParams={{ error: "auth_failed" }} />);
    expect(screen.getByRole("alert").textContent).toBe(
      "Sign-in did not complete. Please try again.",
    );
  });

  it("ignores error codes it does not know", () => {
    render(<LoginPage searchParams={{ error: "constructor" }} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
