"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { GripVertical } from "lucide-react";
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
      className={cn(
        "relative rounded-md border border-border bg-card p-3 text-sm shadow-sm",
        isDragging && "opacity-50",
      )}
    >
      {/* Drag handle — listeners/attributes scoped here so Link clicks work cleanly */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 cursor-grab touch-none text-muted-foreground hover:text-foreground focus:outline-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Link href={`/applications/${id}`} className="block pr-5">
        <div className="font-medium truncate">{title}</div>
        <div className="text-xs text-muted-foreground truncate">{company}</div>
        <div className="mt-2 text-xs text-muted-foreground">
          {new Date(updatedAt).toLocaleDateString()}
        </div>
      </Link>
    </div>
  );
}
