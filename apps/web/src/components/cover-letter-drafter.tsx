"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Draft {
  id: string;
  version: number;
  aiDraft: string;
  userEdited: string;
  finalized: boolean;
  createdAt: string;
}

interface Props {
  application: {
    id: string;
    resumeVariantId: string | null;
    currentCoverLetterId: string | null;
    drafts: (Draft & { kind: string })[];
  };
  variants: { id: string; name: string }[];
}

export function CoverLetterDrafter({ application, variants }: Props) {
  const letters = application.drafts.filter((d) => d.kind === "cover_letter");
  const latest = letters[0] ?? null;

  const [variantId, setVariantId] = useState<string>(
    application.resumeVariantId ?? variants[0]?.id ?? "",
  );
  const [override, setOverride] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(latest);
  const [editedBody, setEditedBody] = useState(latest?.userEdited || latest?.aiDraft || "");
  const [alternates, setAlternates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentDraft) setEditedBody(currentDraft.userEdited || currentDraft.aiDraft);
  }, [currentDraft?.id]);

  async function draft() {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/applications/${application.id}/draft-cover-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeVariantId: variantId, override: override || undefined }),
      });
      const json = await r.json() as {
        draftId?: string;
        version?: number;
        body?: string;
        alternateOpenings?: string[];
        error?: unknown;
      };
      if (!r.ok) throw new Error(String(json.error ?? "draft failed"));
      setCurrentDraft({
        id: json.draftId!,
        version: json.version!,
        aiDraft: json.body!,
        userEdited: "",
        finalized: false,
        createdAt: new Date().toISOString(),
      });
      setEditedBody(json.body!);
      setAlternates(json.alternateOpenings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "draft failed");
    } finally {
      setBusy(false);
    }
  }

  async function save(finalize: boolean) {
    if (!currentDraft) return;
    setBusy(true);
    try {
      await fetch(`/api/applications/${application.id}/draft-cover-letter`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: currentDraft.id,
          userEdited: editedBody,
          finalized: finalize,
        }),
      });
      setCurrentDraft({ ...currentDraft, userEdited: editedBody, finalized: finalize });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Editor section - 2 cols */}
      <section className="col-span-2 space-y-4 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">
            Cover letter {currentDraft ? `· v${currentDraft.version}` : ""}
          </h2>
          {currentDraft?.finalized && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
              Finalized
            </span>
          )}
        </div>
        <Textarea
          className="min-h-[420px] font-mono text-xs"
          value={editedBody}
          onChange={(e) => setEditedBody(e.target.value)}
          placeholder={currentDraft ? "" : "Click Draft to generate a cover letter"}
        />
        <div className="flex gap-2">
          <Button onClick={() => void save(false)} disabled={busy || !currentDraft} variant="outline">
            Save edits
          </Button>
          <Button onClick={() => void save(true)} disabled={busy || !currentDraft}>
            Finalize
          </Button>
        </div>
      </section>

      {/* AI panel - 1 col */}
      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-medium">AI panel</h2>
        <div className="space-y-2">
          <Label htmlFor="variant">Resume variant</Label>
          <select
            id="variant"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="override">Focus note (optional)</Label>
          <Textarea
            id="override"
            value={override}
            onChange={(e) => setOverride(e.target.value)}
            placeholder="e.g., emphasize Claude API work"
          />
        </div>
        <Button className="w-full" onClick={() => void draft()} disabled={busy || !variantId}>
          {busy ? "Drafting..." : letters.length ? "Regenerate" : "Draft"}
        </Button>

        {alternates.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Alternate openings
            </div>
            {alternates.map((alt, i) => (
              <button
                key={i}
                className="block w-full rounded-md border border-border bg-secondary/40 p-2 text-left text-xs hover:bg-secondary"
                onClick={() =>
                  setEditedBody((body) => {
                    const rest = body.split("\n").slice(1).join("\n");
                    return alt + (rest ? "\n" + rest : "");
                  })
                }
              >
                {alt}
              </button>
            ))}
          </div>
        )}

        {letters.length > 1 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Versions</div>
            {letters.map((d) => (
              <button
                key={d.id}
                className="block w-full rounded-md border border-border bg-background p-2 text-left text-xs hover:bg-secondary"
                onClick={() => setCurrentDraft(d)}
              >
                v{d.version} {d.finalized ? " · final" : ""} ·{" "}
                {new Date(d.createdAt).toLocaleString()}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>
    </div>
  );
}
