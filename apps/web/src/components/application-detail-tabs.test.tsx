import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { z } from "zod";
import { contactSchema } from "@jobcopilot/shared";
import { ApplicationDetailTabs } from "./application-detail-tabs";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

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
  refresh.mockClear();
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

describe("ApplicationDetailTabs contacts save", () => {
  function addContact(name: string, linkedin: string) {
    fireEvent.click(screen.getByRole("button", { name: /add contact/i }));
    const names = screen.getAllByPlaceholderText("Jane Doe");
    const links = screen.getAllByPlaceholderText(/linkedin\.com\/in\/jane/i);
    fireEvent.change(names[names.length - 1]!, { target: { value: name } });
    fireEvent.change(links[links.length - 1]!, { target: { value: linkedin } });
  }

  function callsTo(method: string) {
    return fetchMock.mock.calls.filter((c) => (c[1] as RequestInit).method === method);
  }

  it("prepends https:// to a scheme-less LinkedIn value", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    renderTabs();
    addContact("Jane Doe", "linkedin.com/in/jane");
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await screen.findByText("Saved!");
    const put = callsTo("PUT")[0]!;
    const body = JSON.parse((put[1] as RequestInit).body as string);
    expect(body.contacts[0].linkedin).toBe("https://linkedin.com/in/jane");
  });

  it("drops fully empty contact rows", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    renderTabs();
    fireEvent.click(screen.getByRole("button", { name: /add contact/i }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await screen.findByText("Saved!");
    const body = JSON.parse((callsTo("PUT")[0]![1] as RequestInit).body as string);
    expect(body.contacts).toEqual([]);
  });

  it("blocks the whole save with a readable message when a row has no name", async () => {
    renderTabs();
    addContact("", "linkedin.com/in/jane");
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await screen.findByText(/name/i, { selector: "span.text-destructive" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the real contacts-route error and does not save notes when contacts are rejected", async () => {
    const flat = z
      .object({ contacts: z.array(contactSchema) })
      .safeParse({ contacts: [{ name: "Jane Doe", email: "jane@company" }] });
    if (flat.success) throw new Error("expected the schema to reject the email");
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      if (init.method === "PUT") {
        return { ok: false, json: async () => ({ error: flat.error.flatten() }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    renderTabs();
    addContact("Jane Doe", "");
    const emails = screen.getAllByPlaceholderText("jane@company.com");
    fireEvent.change(emails[emails.length - 1]!, { target: { value: "jane@company" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await screen.findByText("Contacts not saved: Invalid email");
    expect(callsTo("PATCH")).toHaveLength(0);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reports a partial save when the PATCH returns not ok", async () => {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      if (init.method === "PATCH") return { ok: false, json: async () => ({}) };
      return { ok: true, json: async () => ({}) };
    });
    renderTabs();
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await screen.findByText("Contacts saved, but notes/follow-up failed to save");
    expect(screen.queryByText("Saved!")).toBeNull();
    const methods = fetchMock.mock.calls.map((c) => (c[1] as RequestInit).method);
    expect(methods.indexOf("PUT")).toBeLessThan(methods.indexOf("PATCH"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("reports a partial save when the PATCH request throws", async () => {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      if (init.method === "PATCH") throw new TypeError("Failed to fetch");
      return { ok: true, json: async () => ({}) };
    });
    renderTabs();
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await screen.findByText("Contacts saved, but notes/follow-up failed to save");
    expect(screen.queryByText("Failed to fetch")).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes the route once after a full save", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    renderTabs();
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await screen.findByText("Saved!");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh when a nameless row blocks the save", async () => {
    renderTabs();
    addContact("", "linkedin.com/in/jane");
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await screen.findByText(/name/i, { selector: "span.text-destructive" });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not refresh when the contacts PUT returns not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    renderTabs();
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await screen.findByText("Failed to save contacts");
    expect(refresh).not.toHaveBeenCalled();
  });
});
