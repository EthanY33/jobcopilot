import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { CoverLetterDrafter, applyAlternateOpening } from "./cover-letter-drafter";

const V1_BODY = "Dear Team,\n\nAI v1 first sentence. More.\n\nPara two.";

const application = {
  id: "app-1",
  resumeVariantId: "var-1",
  currentCoverLetterId: "d1",
  drafts: [
    {
      id: "d1",
      version: 1,
      aiDraft: V1_BODY,
      userEdited: "",
      finalized: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      kind: "cover_letter",
    },
  ],
};
const variants = [{ id: "var-1", name: "Base" }];

let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("applyAlternateOpening", () => {
  it("keeps the salutation and replaces only the first sentence", () => {
    expect(applyAlternateOpening(V1_BODY, "ALT ONE.")).toBe(
      "Dear Team,\n\nALT ONE. More.\n\nPara two.",
    );
  });

  it("keeps the rest of the first paragraph when there is no salutation", () => {
    expect(
      applyAlternateOpening("I am excited. More text in same para.\n\nPara two.", "ALT ONE."),
    ).toBe("ALT ONE. More text in same para.\n\nPara two.");
  });

  it("replaces a lone opening sentence and keeps later paragraphs", () => {
    expect(applyAlternateOpening("Dear Google team,\n\nOnly one.\n\nNext.", "ALT.")).toBe(
      "Dear Google team,\n\nALT.\n\nNext.",
    );
  });

  it("returns the alternate for an empty body", () => {
    expect(applyAlternateOpening("", "ALT.")).toBe("ALT.");
  });
});

describe("CoverLetterDrafter", () => {
  it("clicking an alternate opening keeps the salutation", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ draftId: "d2", version: 2, body: V1_BODY, alternateOpenings: ["ALT ONE."] }),
    );
    render(<CoverLetterDrafter application={application} variants={variants} />);
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    const alt = await screen.findByRole("button", { name: "ALT ONE." });
    fireEvent.click(alt);
    const box = screen.getAllByRole("textbox")[0] as HTMLTextAreaElement;
    expect(box.value).toBe("Dear Team,\n\nALT ONE. More.\n\nPara two.");
  });

  it("reselecting a saved version shows the saved edit and finalizes it", async () => {
    render(<CoverLetterDrafter application={application} variants={variants} />);
    const box = screen.getAllByRole("textbox")[0] as HTMLTextAreaElement;

    fireEvent.change(box, { target: { value: "HAND EDITED V1" } });
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    fireEvent.click(screen.getByRole("button", { name: "Save edits" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((screen.getByRole("button", { name: "Save edits" }) as HTMLButtonElement).disabled).toBe(false));

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ draftId: "d2", version: 2, body: "AI v2", alternateOpenings: [] }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    await waitFor(() => expect(box.value).toBe("AI v2"));

    fireEvent.click(screen.getByRole("button", { name: /^v1/ }));
    await waitFor(() => expect(box.value).toBe("HAND EDITED V1"));

    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    fireEvent.click(screen.getByRole("button", { name: "Finalize" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const init = fetchMock.mock.calls[2]![1] as { body: string };
    expect(JSON.parse(init.body)).toEqual({
      draftId: "d1",
      userEdited: "HAND EDITED V1",
      finalized: true,
    });
    await waitFor(() => expect(screen.getByRole("button", { name: /^v1.*final/ })).toBeTruthy());
  });
});
