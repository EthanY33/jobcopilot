"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  title: string;
  company: string;
  updatedAt: string;
}

export function ApplicationCard({ id, title, company, updatedAt }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  // The whole card still starts a pointer drag, but role/tabIndex and the
  // keyboard activator live on a separate handle so the link is not nested
  // inside an interactive role.
  const { onPointerDown, ...handleListeners } = listeners ?? {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      onPointerDown={onPointerDown as React.PointerEventHandler<HTMLDivElement> | undefined}
      className={cn(
        "cursor-grab active:cursor-grabbing touch-none select-none",
        // The focusable handle is sr-only, so draw the focus ring on the whole card.
        "[&:has(:focus-visible)]:outline [&:has(:focus-visible)]:outline-2",
        isDragging && "opacity-50",
      )}
    >
      <button
        type="button"
        className="sr-only"
        aria-label={`Move ${title}`}
        {...attributes}
        {...handleListeners}
      />
      <Card className="bg-card/80 hover:bg-card transition-colors">
        <CardContent className="p-3 text-sm">
          <Link
            href={`/applications/${id}`}
            className="font-medium truncate block hover:underline"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {title}
          </Link>
          <div className="text-xs text-muted-foreground truncate">{company}</div>
          <div className="mt-2 text-xs text-muted-foreground font-mono">
            {new Date(updatedAt).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
