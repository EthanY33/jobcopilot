import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AddApplicationDialog } from "./add-application-dialog";

const { push, refresh } = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  push.mockReset();
  refresh.mockReset();
});

describe("AddApplicationDialog", () => {
  it("invalidates the applications query after a successful add", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ applicationId: "new-1" }), { status: 200 })),
    );
    const qc = new QueryClient();
    qc.setQueryData(["applications"], []);
    render(
      <QueryClientProvider client={qc}>
        <AddApplicationDialog />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add application" }));
    fireEvent.change(await screen.findByLabelText("Job posting URL"), {
      target: { value: "https://example.com/job" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Extract + create" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/applications/new-1"));
    expect(qc.getQueryState(["applications"])?.isInvalidated).toBe(true);
  });
});
