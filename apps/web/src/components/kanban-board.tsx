"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApplicationCard } from "./application-card";
import type { ApplicationStatus } from "@jobcopilot/shared";
import { APPLICATION_STATUSES } from "@jobcopilot/shared";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  phone_screen: "Phone screen",
  onsite: "Onsite",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
};

interface AppRow {
  id: string;
  status: ApplicationStatus;
  lastActivityAt: string;
  jobPosting: { title: string; company: string };
}

interface KanbanColumnProps {
  status: ApplicationStatus;
  cards: AppRow[];
}

function KanbanColumn({ status, cards }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div className="min-w-[200px] space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {STATUS_LABELS[status]}
        </div>
        <div className="text-xs text-muted-foreground">{cards.length}</div>
      </div>
      <SortableContext items={cards.map((a) => a.id)} id={status}>
        <div ref={setNodeRef} className="space-y-2 rounded-md bg-secondary/30 p-2 min-h-[100px]">
          {cards.map((a) => (
            <ApplicationCard
              key={a.id}
              id={a.id}
              title={a.jobPosting.title}
              company={a.jobPosting.company}
              updatedAt={a.lastActivityAt}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function resolveTargetStatus(e: DragEndEvent): ApplicationStatus | null {
  const overId = e.over?.id;
  if (!overId) return null;
  // Dropped directly on a column (from useDroppable)
  if (APPLICATION_STATUSES.includes(overId as ApplicationStatus)) {
    return overId as ApplicationStatus;
  }
  // Dropped on a card — get its container's status via SortableContext
  const containerId = e.over?.data.current?.sortable?.containerId as string | undefined;
  if (containerId && APPLICATION_STATUSES.includes(containerId as ApplicationStatus)) {
    return containerId as ApplicationStatus;
  }
  return null;
}

export function KanbanBoard() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const qc = useQueryClient();
  const {
    data: apps = [],
    isLoading,
    isError,
  } = useQuery<AppRow[]>({
    queryKey: ["applications"],
    queryFn: async () => {
      const r = await fetch("/api/applications");
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ApplicationStatus }) => {
      const r = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("update failed");
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["applications"] });
      const prev = qc.getQueryData<AppRow[]>(["applications"]);
      qc.setQueryData<AppRow[]>(["applications"], (cur = []) =>
        cur.map((a) => (a.id === id ? { ...a, status } : a)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["applications"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const grouped = useMemo(() => {
    const map = new Map<ApplicationStatus, AppRow[]>();
    for (const s of APPLICATION_STATUSES) map.set(s, []);
    for (const a of apps) map.get(a.status)?.push(a);
    return map;
  }, [apps]);

  const activeApp = activeId ? apps.find((a) => a.id === activeId) : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const targetStatus = resolveTargetStatus(e);
    const draggedId = e.active.id as string;
    if (!targetStatus) return;
    const active = apps.find((a) => a.id === draggedId);
    if (!active || active.status === targetStatus) return;
    updateStatus({ id: draggedId, status: targetStatus });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Loading applications…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-16 text-destructive text-sm">
        Failed to load applications. Please refresh and try again.
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-7 gap-3 overflow-x-auto">
        {APPLICATION_STATUSES.map((status) => (
          <KanbanColumn key={status} status={status} cards={grouped.get(status) ?? []} />
        ))}
      </div>
      <DragOverlay>
        {activeApp ? (
          <div className="rounded-md border border-border bg-card p-3 text-sm shadow-lg">
            <div className="font-medium truncate">{activeApp.jobPosting.title}</div>
            <div className="text-xs text-muted-foreground truncate">
              {activeApp.jobPosting.company}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
