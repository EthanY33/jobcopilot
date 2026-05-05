"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  title: string;
  company: string;
  updatedAt: string;
}

export function ApplicationCard({ id, title, company, updatedAt }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-md border border-border bg-card p-3 text-sm shadow-sm cursor-grab active:cursor-grabbing touch-none select-none",
        isDragging && "opacity-50",
      )}
    >
      <Link
        href={`/applications/${id}`}
        className="font-medium truncate block hover:underline"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {title}
      </Link>
      <div className="text-xs text-muted-foreground truncate">{company}</div>
      <div className="mt-2 text-xs text-muted-foreground">
        {new Date(updatedAt).toLocaleDateString()}
      </div>
    </div>
  );
}
