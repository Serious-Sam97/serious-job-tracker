import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { api, type Application, type ApplicationInput, type Status } from "../api";
import { CLOSED, PIPELINE, STATUS_LABEL } from "../constants";
import { fmtDate, fmtSalary, todayStr } from "../format";
import { FollowUp, PriorityTag } from "./ui";
import { useToast } from "./Toast";

export default function Board({ apps, queryKey }: { apps: Application[]; queryKey: QueryKey }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [showClosed, setShowClosed] = useState(false);
  const [dragging, setDragging] = useState<Application | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Space picks a card up; Enter is left free to open it.
    useSensor(KeyboardSensor, { keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] } }),
  );

  const move = useMutation({
    mutationFn: ({ app, status }: { app: Application; status: Status }) => {
      const data: ApplicationInput = { status };
      if (app.status === "WISHLIST" && !app.appliedAt) data.appliedAt = todayStr();
      return api.patch(app.id, data);
    },
    onMutate: async ({ app, status }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<Application[]>(queryKey);
      qc.setQueryData<Application[]>(queryKey, (old) => old?.map((a) => (a.id === app.id ? { ...a, status } : a)));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast(e.message, "error");
    },
    onSuccess: (_d, { app, status }) => toast(`${app.company} → ${STATUS_LABEL[status]}`),
    onSettled: () => qc.invalidateQueries(),
  });

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const app = apps.find((a) => a.id === e.active.id);
    const status = e.over?.id as Status | undefined;
    if (app && status && status !== app.status) move.mutate({ app, status });
  };

  const columns = showClosed ? [...PIPELINE, ...CLOSED] : PIPELINE;
  const closedCount = apps.filter((a) => CLOSED.includes(a.status)).length;

  return (
    <div className="board-wrap">
      <div className="board-toolbar">
        <label className="toggle">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
          Show closed columns ({closedCount})
        </label>
        <span className="muted small">Drag cards between columns to change status.</span>
      </div>
      <DndContext
        sensors={sensors}
        onDragStart={(e) => setDragging(apps.find((a) => a.id === e.active.id) ?? null)}
        onDragCancel={() => setDragging(null)}
        onDragEnd={onDragEnd}
      >
        <div className="board">
          {columns.map((status) => (
            <Column key={status} status={status} apps={apps.filter((a) => a.status === status)} />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>{dragging && <Card app={dragging} overlay />}</DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({ status, apps }: { status: Status; apps: Application[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section ref={setNodeRef} className={`column status-${status.toLowerCase()}${isOver ? " is-over" : ""}`}>
      <header className="column-head">
        <span className="dot" aria-hidden />
        <h3>{STATUS_LABEL[status]}</h3>
        <span className="count">{apps.length}</span>
      </header>
      <div className="column-body">
        {apps.map((a) => (
          <DraggableCard key={a.id} app={a} />
        ))}
        {apps.length === 0 && <div className="column-empty">Drop here</div>}
      </div>
    </section>
  );
}

function DraggableCard({ app }: { app: Application }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: app.id });
  const navigate = useNavigate();
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={isDragging ? "card-ghost" : undefined}
      onClick={() => navigate(`/applications/${app.id}`)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === "Enter" && !isDragging) navigate(`/applications/${app.id}`);
      }}
    >
      <Card app={app} />
    </div>
  );
}

function Card({ app, overlay }: { app: Application; overlay?: boolean }) {
  const salary = fmtSalary(app);
  return (
    <article className={`kcard${overlay ? " kcard-overlay" : ""}`}>
      <div className="kcard-top">
        <strong className="kcard-company">{app.company}</strong>
        <PriorityTag priority={app.priority} />
      </div>
      <div className="kcard-role">{app.role}</div>
      <div className="kcard-meta">
        {app.appliedAt && <span>Applied {fmtDate(app.appliedAt)}</span>}
        {salary && <span>{salary}</span>}
      </div>
      {app.followUpAt && (
        <div className="kcard-follow">
          <FollowUp app={app} withDate={false} />
        </div>
      )}
    </article>
  );
}
