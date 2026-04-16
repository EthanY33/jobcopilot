"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Suggestion {
  section: string;
  originalBullet: string;
  suggestedBullet: string;
  rationale: string;
}

interface Props {
  application: { id: string; resumeVariantId: string | null };
  variants: { id: string; name: string }[];
}

export function BulletSuggester({ application, variants }: Props) {
  const [variantId, setVariantId] = useState<string>(
    application.resumeVariantId ?? variants[0]?.id ?? "",
  );
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/applications/${application.id}/suggest-bullets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeVariantId: variantId }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(String((json as Record<string, unknown>).error ?? "failed"));
      setSuggestions((json as { suggestions: Suggestion[] }).suggestions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-medium">Resume bullet suggester</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Claude proposes role-tailored rewrites. Truthfulness preserved — only phrasing shifts.
        </p>
        <div className="mt-4 flex items-end gap-3">
          <div className="grow space-y-2">
            <Label>Variant</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
            >
              {variants.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <Button onClick={() => void generate()} disabled={busy || !variantId}>
            {busy ? "Suggesting..." : "Suggest"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </section>

      {suggestions.length > 0 && (
        <section className="space-y-3">
          {suggestions.map((s, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {s.section}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Original</div>
                  <p className="mt-1 text-sm">{s.originalBullet}</p>
                </div>
                <div>
                  <div className="text-xs font-medium text-accent">Suggested</div>
                  <p className="mt-1 text-sm">{s.suggestedBullet}</p>
                </div>
              </div>
              <p className="mt-3 border-t border-border pt-2 text-xs italic text-muted-foreground">
                {s.rationale}
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
