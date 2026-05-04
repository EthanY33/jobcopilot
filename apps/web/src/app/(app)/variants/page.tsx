"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Variant {
  id: string;
  name: string;
  emphasisKeywords: string[];
  bullets: { section: string; items: string[] }[];
}

export default function VariantsPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const r = await fetch("/api/variants");
    if (!r.ok) {
      setError("failed to load variants");
      return;
    }
    setVariants(await r.json());
  }

  useEffect(() => {
    reload();
  }, []);

  async function create() {
    setError(null);
    setCreating(true);
    try {
      const base = variants.find((v) => v.name === "Base");
      const r = await fetch("/api/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          bullets: base?.bullets ?? [],
          emphasisKeywords: [],
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "failed to create");
        return;
      }
      setNewName("");
      await reload();
    } finally {
      setCreating(false);
    }
  }

  async function updateKeywords(id: string, keywords: string[]) {
    const r = await fetch(`/api/variants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emphasisKeywords: keywords }),
    });
    if (!r.ok) {
      setError("failed to save keywords");
      return;
    }
    await reload();
  }

  async function remove(id: string) {
    if (!confirm("Delete this variant?")) return;
    const r = await fetch(`/api/variants/${id}`, { method: "DELETE" });
    if (!r.ok) {
      setError("failed to delete");
      return;
    }
    await reload();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Resume variants</h1>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-medium">New variant</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Clones bullets from your Base variant. Edit keywords after creating to bias the
          bullet suggester.
        </p>
        <div className="mt-3 flex items-end gap-3">
          <div className="grow space-y-2">
            <Label>Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="AI/ML focus"
            />
          </div>
          <Button onClick={create} disabled={!newName.trim() || creating}>
            {creating ? "Creating…" : "Create (from Base)"}
          </Button>
        </div>
        {error && <div className="mt-3 text-sm text-destructive">{error}</div>}
      </section>

      <section className="space-y-3">
        {variants.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No variants yet. Upload a resume on the Profile page to create your Base
            variant.
          </div>
        ) : (
          variants.map((v) => (
            <VariantRow
              key={v.id}
              variant={v}
              onUpdateKeywords={(kw) => updateKeywords(v.id, kw)}
              onDelete={() => remove(v.id)}
            />
          ))
        )}
      </section>
    </div>
  );
}

function VariantRow({
  variant,
  onUpdateKeywords,
  onDelete,
}: {
  variant: Variant;
  onUpdateKeywords: (kw: string[]) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState(variant.emphasisKeywords.join(", "));
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="font-medium">{variant.name}</div>
        {variant.name !== "Base" && (
          <Button variant="ghost" size="sm" onClick={onDelete}>
            Delete
          </Button>
        )}
      </div>
      <div className="mt-3 space-y-2">
        <Label>Emphasis keywords (comma-separated)</Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const next = Array.from(
              new Set(
                text
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              ),
            );
            const prev = variant.emphasisKeywords;
            const same =
              next.length === prev.length && next.every((k, i) => k === prev[i]);
            if (!same) onUpdateKeywords(next);
          }}
          className="min-h-[60px]"
        />
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        {variant.bullets.length} sections ·{" "}
        {variant.bullets.reduce((n, s) => n + s.items.length, 0)} bullets
      </div>
    </div>
  );
}
