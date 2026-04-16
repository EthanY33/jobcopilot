import { KanbanBoard } from "@/components/kanban-board";
import { AddApplicationDialog } from "@/components/add-application-dialog";

export default function TrackerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Tracker</h1>
        <AddApplicationDialog />
      </div>
      <KanbanBoard />
    </div>
  );
}
