"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GlassCard } from "@/components/brand/glass-card";

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
  const [localLetters, setLocalLetters] = useState<(Draft & { kind: string })[]>(() =>
    application.drafts.filter((d) => d.kind === "cover_letter"),
  );
  const latest = localLetters[0] ?? null;

  const [variantId, setVariantId] = useState<string>(
    application.resumeVariantId ?? variants[0]?.id ?? "",
  );
  const [override, setOverride] = useState("");
  const [busyAction, setBusyAction] = useState<"draft" | "save" | null>(null);
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(latest);
  const [editedBody, setEditedBody] = useState(latest?.userEdited || latest?.aiDraft || "");
  const [alternates, setAlternates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentDraft) setEditedBody(currentDraft.userEdited || currentDraft.aiDraft);
  }, [currentDraft?.id]);

  async function draft() {
    setError(null);
    setBusyAction("draft");
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
      const newDraft: Draft & { kind: string } = {
        id: json.draftId!,
        version: json.version!,
        aiDraft: json.body!,
        userEdited: "",
        finalized: false,
        createdAt: new Date().toISOString(),
        kind: "cover_letter",
      };
      setCurrentDraft(newDraft);
      setLocalLetters((prev) => [newDraft, ...prev]);
      setEditedBody(json.body!);
      setAlternates(json.alternateOpenings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "draft failed");
    } finally {
      setBusyAction(null);
    }
  }

  async function save(finalize: boolean) {
    if (!currentDraft) return;
    setError(null);
    setBusyAction("save");
    try {
      const r = await fetch(`/api/applications/${application.id}/draft-cover-letter`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: currentDraft.id,
          userEdited: editedBody,
          finalized: finalize,
        }),
      });
      if (!r.ok) {
        const json = await r.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error(String(json.error ?? "save failed"));
      }
      setCurrentDraft({ ...currentDraft, userEdited: editedBody, finalized: finalize });
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Editor section - 2 cols */}
      <Card className="col-span-2"><CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">
            Cover letter {currentDraft ? `· v${currentDraft.version}` : ""}
          </h2>
          {currentDraft?.finalized && (
            <Badge variant="success">Finalized</Badge>
          )}
        </div>
        <Textarea
          className="min-h-[420px] font-mono text-xs"
          value={editedBody}
          onChange={(e) => setEditedBody(e.target.value)}
          placeholder={currentDraft ? "" : "Click Draft to generate a cover letter"}
        />
        <div className="flex gap-2">
          <Button onClick={() => void save(false)} disabled={busyAction !== null || !currentDraft} variant="outline">
            {busyAction === "save" ? "Saving…" : "Save edits"}
          </Button>
          <Button onClick={() => void save(true)} disabled={busyAction !== null || !currentDraft}>
            {busyAction === "save" ? "Saving…" : "Finalize"}
          </Button>
        </div>
      </CardContent></Card>

      {/* AI panel - 1 col */}
      <GlassCard><div className="space-y-4 p-6">
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
        <Button variant="gradient" className="w-full" onClick={() => void draft()} disabled={busyAction !== null || !variantId}>
          {busyAction === "draft" ? "Drafting..." : localLetters.length ? "Regenerate" : "Draft"}
        </Button>

        {alternates.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Alternate openings
            </div>
            {alternates.map((alt, i) => (
              <Button
                key={i}
                variant="ghost"
                size="sm"
                className="block h-auto w-full justify-start whitespace-normal text-left text-xs"
                onClick={() =>
                  setEditedBody((body) => {
                    const rest = body.split("\n").slice(1).join("\n");
                    return alt + (rest ? "\n" + rest : "");
                  })
                }
              >
                {alt}
              </Button>
            ))}
          </div>
        )}

        {localLetters.length > 1 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Versions</div>
            {localLetters.map((d) => (
              <Button
                key={d.id}
                variant="ghost"
                size="sm"
                className="block h-auto w-full justify-start text-left text-xs"
                onClick={() => setCurrentDraft(d)}
              >
                v{d.version} {d.finalized ? " · final" : ""} ·{" "}
                {new Date(d.createdAt).toLocaleString()}
              </Button>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div></GlassCard>
    </div>
  );
}
