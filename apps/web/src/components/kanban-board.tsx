"use client";

import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
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

export function KanbanBoard() {
  const [_dragActive, setDragActive] = useState(false);
  const qc = useQueryClient();
  const { data: apps = [] } = useQuery<AppRow[]>({
    queryKey: ["applications"],
    queryFn: async () => {
      const r = await fetch("/api/applications");
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  const mutate = useMutation({
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
  const byStatus = (s: ApplicationStatus) => apps.filter((a) => a.status === s);

  function onDragEnd(e: DragEndEvent) {
    setDragActive(false);
    const overId = e.over?.id as ApplicationStatus | undefined;
    const activeId = e.active.id as string;
    if (!overId || !APPLICATION_STATUSES.includes(overId)) return;
    const active = apps.find((a) => a.id === activeId);
    if (!active || active.status === overId) return;
    mutate.mutate({ id: activeId, status: overId });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd} onDragStart={() => setDragActive(true)}>
      <div className="grid grid-cols-7 gap-3 overflow-x-auto">
        {APPLICATION_STATUSES.map((status) => {
          const col = byStatus(status);
          return (
            <div key={status} id={status} className="min-w-[200px] space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {STATUS_LABELS[status]}
                </div>
                <div className="text-xs text-muted-foreground">{col.length}</div>
              </div>
              <SortableContext items={col.map((a) => a.id)} id={status}>
                <div className="space-y-2 rounded-md bg-secondary/30 p-2 min-h-[100px]">
                  {col.map((a) => (
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
        })}
      </div>
    </DndContext>
  );
}
