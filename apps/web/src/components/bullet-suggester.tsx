"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { GlassCard } from "@/components/brand/glass-card";
import type { BulletSuggestion } from "@jobcopilot/prompts";

interface Props {
  application: { id: string; resumeVariantId: string | null };
  variants: { id: string; name: string }[];
}

export function BulletSuggester({ application, variants }: Props) {
  const [variantId, setVariantId] = useState<string>(
    application.resumeVariantId ?? variants[0]?.id ?? "",
  );
  const [suggestions, setSuggestions] = useState<BulletSuggestion[]>([]);
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
      setSuggestions((json as { suggestions: BulletSuggestion[] }).suggestions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  if (variants.length === 0) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Create a resume variant first to use the bullet suggester.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <GlassCard><div className="p-6">
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
          <Button variant="gradient" onClick={() => void generate()} disabled={busy || !variantId}>
            {busy ? "Suggesting..." : "Suggest"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div></GlassCard>

      {busy && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Generating suggestions…
        </Card>
      )}

      {suggestions.length > 0 && (
        <section className="space-y-3">
          {suggestions.map((s, i) => (
            <Card key={i} className="p-4">
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
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
