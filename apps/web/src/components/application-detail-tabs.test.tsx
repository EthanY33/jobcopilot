import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ApplicationDetailTabs } from "./application-detail-tabs";

vi.mock("./cover-letter-drafter", () => ({ CoverLetterDrafter: () => null }));
vi.mock("./bullet-suggester", () => ({ BulletSuggester: () => null }));

const application = {
  id: "app-1",
  notes: "ORIGINAL",
  followUpAt: null,
  contacts: [],
  jobPosting: { description: "", requirements: [] },
  drafts: [],
};

function renderTabs() {
  return render(<ApplicationDetailTabs application={application} variants={[]} />);
}

function switchTab(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false });
}

function notesBox() {
  return screen.getByPlaceholderText(/add notes/i) as HTMLTextAreaElement;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ApplicationDetailTabs overview tab", () => {
  it("keeps unsaved notes when switching to another tab and back", () => {
    renderTabs();
    fireEvent.change(notesBox(), { target: { value: "Recruiter call Tue" } });
    switchTab("Timeline");
    switchTab("Overview");
    expect(notesBox().value).toBe("Recruiter call Tue");
  });

  it("sends the saved notes again after a tab round trip", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    renderTabs();
    fireEvent.change(notesBox(), { target: { value: "NEW" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await screen.findByText("Saved!");
    switchTab("Timeline");
    switchTab("Overview");
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(4));
    const patchBodies = fetchMock.mock.calls
      .filter((c) => (c[1] as RequestInit).method === "PATCH")
      .map((c) => JSON.parse((c[1] as RequestInit).body as string));
    expect(patchBodies).toHaveLength(2);
    expect(patchBodies[1].notes).toBe("NEW");
  });
});
