import type { CSSProperties, ReactNode } from "react";
import type { Priority, Status } from "../api";
import { PRIORITY_LABEL, STATUS_LABEL } from "../constants";
import { followUpState, fmtDate, relativeDay } from "../format";

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge status-${status.toLowerCase()}`}>
      <span className="dot" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityTag({ priority }: { priority: Priority }) {
  if (priority === "MEDIUM") return null;
  return <span className={`prio prio-${priority.toLowerCase()}`}>{PRIORITY_LABEL[priority]}</span>;
}

export function FollowUp({ app, withDate = true }: { app: { followUpAt: string | null; status: Status }; withDate?: boolean }) {
  const state = followUpState(app);
  if (!app.followUpAt) return <span className="muted">—</span>;
  return (
    <span className={`followup followup-${state ?? "closed"}`} title={fmtDate(app.followUpAt)}>
      {withDate ? `${fmtDate(app.followUpAt)} · ` : ""}
      {relativeDay(app.followUpAt)}
    </span>
  );
}

const AVATAR_HUES = ["applied", "screening", "interviewing", "offer", "accepted", "rejected"];

export function Avatar({ name, size }: { name: string; size?: "lg" }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = AVATAR_HUES[h % AVATAR_HUES.length];
  return (
    <span className={`avatar${size ? ` avatar-${size}` : ""}`} style={{ "--av": `var(--st-${hue})` } as CSSProperties} aria-hidden>
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children}
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" aria-label="Loading" />;
}

export function ErrorBox({ error }: { error: unknown }) {
  return <div className="error-box">{error instanceof Error ? error.message : "Something went wrong"}</div>;
}
