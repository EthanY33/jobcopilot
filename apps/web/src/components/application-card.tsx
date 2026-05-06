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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing touch-none select-none",
        isDragging && "opacity-50",
      )}
    >
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
