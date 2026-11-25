"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Contact } from "@jobcopilot/shared";
import { CoverLetterDrafter } from "./cover-letter-drafter";
import { BulletSuggester } from "./bullet-suggester";

// ---------------------------------------------------------------------------
// ContactForm — all fields are strings for controlled inputs.
// _formId is a stable key; it is stripped before sending to the API.
// ---------------------------------------------------------------------------

interface ContactForm {
  _formId: string;
  name: string;
  role: string;
  email: string;
  linkedin: string;
}

function ensureHttps(v: string): string {
  const trimmed = v.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isBlankContact(form: ContactForm): boolean {
  return [form.name, form.role, form.email, form.linkedin].every((v) => v.trim() === "");
}

/** Strip empty strings → undefined, normalise LinkedIn to https, and drop _formId to produce API-ready Contact. */
function toContact(form: ContactForm): Contact {
  return {
    name: form.name.trim(),
    role: form.role.trim() || undefined,
    email: form.email.trim() || undefined,
    linkedin: ensureHttps(form.linkedin) || undefined,
  };
}

const PARTIAL_SAVE_MESSAGE = "Contacts saved, but notes/follow-up failed to save";

/** Turn a zod-flattened 400 body from the contacts route into a short readable reason. */
async function contactsErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      error?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    };
    const parts: string[] = [...(body.error?.formErrors ?? [])];
    for (const [field, msgs] of Object.entries(body.error?.fieldErrors ?? {})) {
      const joined = [...new Set(msgs)].join(", ");
      parts.push(field === "contacts" ? joined : `${field}: ${joined}`);
    }
    if (parts.length > 0) return `Contacts not saved: ${parts.join("; ")}`;
  } catch {
    // fall through to the generic message
  }
  return "Failed to save contacts";
}

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  application: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variants: any[];
}

// ---------------------------------------------------------------------------
// OverviewTab
// ---------------------------------------------------------------------------

function OverviewTab({ application }: { application: Props["application"] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<string>(application.notes ?? "");
  const [followUpAt, setFollowUpAt] = useState<string>(
    application.followUpAt ? new Date(application.followUpAt).toISOString().slice(0, 10) : "",
  );
  const [contacts, setContacts] = useState<ContactForm[]>(() => {
    const raw: unknown = application.contacts;
    if (!Array.isArray(raw)) return [];
    return (raw as Contact[]).map((c) => ({
      _formId: crypto.randomUUID(),
      name: c.name ?? "",
      role: c.role ?? "",
      email: c.email ?? "",
      linkedin: c.linkedin ?? "",
    }));
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const id: string = application.id as string;

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    const rows = contacts.filter((c) => !isBlankContact(c));
    if (rows.some((c) => c.name.trim() === "")) {
      setSaveError("Each contact needs a name. Nothing was saved.");
      setSaving(false);
      return;
    }
    let wrote = false;
    try {
      // Contacts go first: if they are rejected, notes and follow-up are not written.
      const contactsRes = await fetch(`/api/applications/${id}/contacts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: rows.map(toContact) }),
      });
      if (!contactsRes.ok) throw new Error(await contactsErrorMessage(contactsRes));
      wrote = true;

      const patchRes = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          followUpAt: followUpAt !== "" ? new Date(followUpAt).toISOString() : null,
        }),
      });
      if (!patchRes.ok) throw new Error(PARTIAL_SAVE_MESSAGE);

      setSaved(true);
    } catch (err) {
      setSaveError(wrote ? PARTIAL_SAVE_MESSAGE : err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
      // Refresh the server payload so a later remount does not re-seed stale values.
      if (wrote) router.refresh();
    }
  }

  function addContact() {
    setSaved(false);
    setContacts((prev) => [
      ...prev,
      { _formId: crypto.randomUUID(), name: "", role: "", email: "", linkedin: "" },
    ]);
  }

  function removeContact(index: number) {
    setSaved(false);
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  function updateContact(index: number, field: keyof Omit<ContactForm, "_formId">, value: string) {
    setSaved(false);
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    );
  }

  const jobPosting = application.jobPosting as {
    description?: string;
    requirements?: string[];
  };

  return (
    <div className="space-y-6">
      {/* Job Description */}
      {jobPosting.description && (
        <Card className="p-4 space-y-2">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Job Description</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {jobPosting.description}
          </p>
        </Card>
      )}

      {/* Requirements */}
      {Array.isArray(jobPosting.requirements) && jobPosting.requirements.length > 0 && (
        <Card className="p-4 space-y-2">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Requirements</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {(jobPosting.requirements as string[]).map((req, i) => (
              <li key={i}>{req}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Notes */}
      <Card className="p-4 space-y-2">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Notes</h2>
        <Textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
          placeholder="Add notes about this application…"
          className="min-h-[120px]"
          maxLength={5000}
        />
      </Card>

      {/* Follow-up date */}
      <Card className="p-4 space-y-2">
        <Label htmlFor="follow-up-date" className="mb-2 block text-sm font-semibold text-foreground">
          Follow-up Date
        </Label>
        <Input
          id="follow-up-date"
          type="date"
          value={followUpAt}
          onChange={(e) => { setFollowUpAt(e.target.value); setSaved(false); }}
        />
      </Card>

      {/* Contacts */}
      <Card className="p-4 space-y-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Contacts</h2>
          <Button variant="outline" size="sm" onClick={addContact}>
            + Add Contact
          </Button>
        </div>
        {contacts.length === 0 && (
          <p className="text-sm text-muted-foreground">No contacts yet.</p>
        )}
        <div className="space-y-4">
          {contacts.map((contact, i) => (
            <div key={contact._formId} className="rounded-md border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Contact {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeContact(i)}
                  className="text-xs text-destructive hover:underline"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="mb-1 block text-xs text-muted-foreground">Name</Label>
                  <Input
                    type="text"
                    value={contact.name}
                    onChange={(e) => updateContact(i, "name", e.target.value)}
                    placeholder="Jane Doe"
                    maxLength={200}
                    className="h-8 px-2 py-1"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-muted-foreground">Role</Label>
                  <Input
                    type="text"
                    value={contact.role}
                    onChange={(e) => updateContact(i, "role", e.target.value)}
                    placeholder="Recruiter"
                    maxLength={200}
                    className="h-8 px-2 py-1"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    value={contact.email}
                    onChange={(e) => updateContact(i, "email", e.target.value)}
                    placeholder="jane@company.com"
                    maxLength={200}
                    className="h-8 px-2 py-1"
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs text-muted-foreground">LinkedIn</Label>
                  <Input
                    type="text"
                    value={contact.linkedin}
                    onChange={(e) => updateContact(i, "linkedin", e.target.value)}
                    placeholder="linkedin.com/in/jane"
                    maxLength={200}
                    className="h-8 px-2 py-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
        {saved && !saving && (
          <span className="text-sm text-success">Saved!</span>
        )}
        {saveError && (
          <span className="text-sm text-destructive">{saveError}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TimelineTab
// ---------------------------------------------------------------------------

function TimelineTab({ application }: { application: Props["application"] }) {
  const drafts: unknown[] = Array.isArray(application.drafts) ? application.drafts : [];

  if (drafts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        No drafts yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(drafts as Array<{
        id: string;
        kind: string;
        version: number;
        finalized: boolean;
        createdAt: string;
      }>).map((draft) => (
        <div
          key={draft.id}
          className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-3">
            <span className="font-medium capitalize text-foreground">
              {draft.kind.replace(/_/g, " ")}
            </span>
            <Badge variant="secondary" className="font-mono text-[10px]">v{draft.version}</Badge>
            {draft.finalized && (
              <Badge variant="success">Finalized</Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(draft.createdAt).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ApplicationDetailTabs (main export)
// ---------------------------------------------------------------------------

export function ApplicationDetailTabs({ application, variants }: Props) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
        <TabsTrigger value="resume">Resume</TabsTrigger>
        <TabsTrigger value="answers">Answers</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" forceMount className="data-[state=inactive]:hidden">
        <OverviewTab application={application} />
      </TabsContent>

      <TabsContent value="cover-letter" forceMount className="data-[state=inactive]:hidden">
        <CoverLetterDrafter application={application} variants={variants} />
      </TabsContent>

      <TabsContent value="resume" forceMount className="data-[state=inactive]:hidden">
        <BulletSuggester application={application} variants={variants} />
      </TabsContent>

      <TabsContent value="answers">
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Free-text answer drafter lands in Phase 2 when the extension integrates.
        </div>
      </TabsContent>

      <TabsContent value="timeline">
        <TimelineTab application={application} />
      </TabsContent>
    </Tabs>
  );
}
