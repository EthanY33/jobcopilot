"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Profile {
  baseResumeText: string;
  skills: string[];
  targetRoles: string[];
  targetLocations: string[];
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  phone: string | null;
  authorizedToWorkUs: boolean;
}

function splitCsv(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

function ensureHttps(v: string): string {
  const trimmed = v.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rolesInput, setRolesInput] = useState("");
  const [locationsInput, setLocationsInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/profile");
    if (!r.ok) {
      setLoadError(`Failed to load profile (${r.status})`);
      return;
    }
    const p = (await r.json()) as Profile;
    setProfile(p);
    setRolesInput(p.targetRoles.join(", "));
    setLocationsInput(p.targetLocations.join(", "));
  }

  useEffect(() => {
    load();
  }, []);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);
    const form = new FormData(e.currentTarget);
    if (!(form.get("file") instanceof File)) return;
    setUploading(true);
    try {
      const res = await fetch("/api/profile/parse-resume", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "upload failed");
      await load();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const nextRoles = splitCsv(rolesInput);
      const nextLocations = splitCsv(locationsInput);
      const r = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRoles: nextRoles,
          targetLocations: nextLocations,
          linkedinUrl: profile.linkedinUrl,
          githubUrl: profile.githubUrl,
          portfolioUrl: profile.portfolioUrl,
          phone: profile.phone,
          authorizedToWorkUs: profile.authorizedToWorkUs,
        }),
      });
      const json = await r.json();
      if (!r.ok) {
        const msg =
          typeof json.error === "string" ? json.error : JSON.stringify(json.error);
        throw new Error(msg);
      }
      setProfile({ ...profile, targetRoles: nextRoles, targetLocations: nextLocations });
      setSaveMessage("Saved");
    } catch (err) {
      setSaveMessage(err instanceof Error ? `Save failed: ${err.message}` : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <div>Loading...</div>
        {loadError && <div className="text-destructive">{loadError}</div>}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-medium">Upload resume</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          PDF is parsed by Claude. Creates a default "Base" variant.
        </p>
        <form onSubmit={onUpload} className="mt-4 flex items-center gap-3">
          <Input type="file" name="file" accept="application/pdf" required />
          <Button type="submit" disabled={uploading}>
            {uploading ? "Parsing..." : "Upload"}
          </Button>
        </form>
        {uploadError && <p className="mt-2 text-sm text-destructive">{uploadError}</p>}
      </section>

      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg font-medium">Contact + preferences</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <Input
              value={profile.phone ?? ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value || null })}
            />
          </Field>
          <Field label="LinkedIn URL">
            <Input
              value={profile.linkedinUrl ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, linkedinUrl: e.target.value || null })
              }
              onBlur={(e) => {
                const fixed = ensureHttps(e.target.value);
                setProfile({ ...profile, linkedinUrl: fixed || null });
              }}
            />
          </Field>
          <Field label="GitHub URL">
            <Input
              value={profile.githubUrl ?? ""}
              onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value || null })}
              onBlur={(e) => {
                const fixed = ensureHttps(e.target.value);
                setProfile({ ...profile, githubUrl: fixed || null });
              }}
            />
          </Field>
          <Field label="Portfolio URL">
            <Input
              value={profile.portfolioUrl ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, portfolioUrl: e.target.value || null })
              }
              onBlur={(e) => {
                const fixed = ensureHttps(e.target.value);
                setProfile({ ...profile, portfolioUrl: fixed || null });
              }}
            />
          </Field>
        </div>
        <Field label="Target roles (comma-separated)">
          <Input value={rolesInput} onChange={(e) => setRolesInput(e.target.value)} />
        </Field>
        <Field label="Target locations (comma-separated)">
          <Input
            value={locationsInput}
            onChange={(e) => setLocationsInput(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={profile.authorizedToWorkUs}
            onChange={(e) => setProfile({ ...profile, authorizedToWorkUs: e.target.checked })}
          />
          Authorized to work in the US
        </label>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          {saveMessage && (
            <span
              className={
                saveMessage.startsWith("Save failed")
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              {saveMessage}
            </span>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-medium">Base resume text</h2>
        <Textarea
          className="mt-3 min-h-[300px] font-mono text-xs"
          value={profile.baseResumeText}
          readOnly
          placeholder="Upload a resume to populate..."
        />
        <div className="mt-3 text-xs text-muted-foreground">
          Skills: {profile.skills.join(", ") || "—"}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
