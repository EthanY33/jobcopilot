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

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/profile");
    setProfile(await r.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    if (!(form.get("file") instanceof File)) return;
    setUploading(true);
    try {
      const res = await fetch("/api/profile/parse-resume", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "upload failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetRoles: profile.targetRoles,
        targetLocations: profile.targetLocations,
        linkedinUrl: profile.linkedinUrl,
        githubUrl: profile.githubUrl,
        portfolioUrl: profile.portfolioUrl,
        phone: profile.phone,
        authorizedToWorkUs: profile.authorizedToWorkUs,
      }),
    });
    setSaving(false);
  }

  if (!profile) return <div className="text-sm text-muted-foreground">Loading...</div>;

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
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
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
            />
          </Field>
          <Field label="GitHub URL">
            <Input
              value={profile.githubUrl ?? ""}
              onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value || null })}
            />
          </Field>
          <Field label="Portfolio URL">
            <Input
              value={profile.portfolioUrl ?? ""}
              onChange={(e) =>
                setProfile({ ...profile, portfolioUrl: e.target.value || null })
              }
            />
          </Field>
        </div>
        <Field label="Target roles (comma-separated)">
          <Input
            value={profile.targetRoles.join(", ")}
            onChange={(e) =>
              setProfile({
                ...profile,
                targetRoles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              })
            }
          />
        </Field>
        <Field label="Target locations (comma-separated)">
          <Input
            value={profile.targetLocations.join(", ")}
            onChange={(e) =>
              setProfile({
                ...profile,
                targetLocations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              })
            }
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
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
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
