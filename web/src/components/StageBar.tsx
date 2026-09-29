import type { Status, Update } from "../api";
import { CLOSED, STATUS_LABEL } from "../constants";
import { StatusBadge } from "./ui";

const STAGES: Status[] = ["APPLIED", "SCREENING", "INTERVIEWING", "OFFER", "ACCEPTED"];

// How far an application got: the furthest pipeline stage in its status history.
export function furthestStage(status: Status, updates: Update[]): number {
  const seen = [status, ...updates.map((u) => u.toStatus).filter((s): s is Status => !!s)];
  return Math.max(-1, ...seen.map((s) => STAGES.indexOf(s)));
}

export default function StageBar({ status, updates }: { status: Status; updates: Update[] }) {
  const reached = furthestStage(status, updates);
  const closed = CLOSED.includes(status);
  const current = STAGES.indexOf(status);

  return (
    <div className="stages">
      <div className={`stage-track${closed ? ` closed status-${status.toLowerCase()}` : ""}`}>
        {STAGES.map((s, i) => (
          <div
            key={s}
            className={[
              "stage",
              !closed && `status-${STAGES[Math.max(current, 0)].toLowerCase()}`,
              i <= reached && "reached",
              i === current && "current",
              closed && i === reached && "ended",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="stage-bar" />
            <span className="ellipsis">{STATUS_LABEL[s]}</span>
          </div>
        ))}
      </div>
      {status === "WISHLIST" && <div className="stage-closed muted small">On your wishlist — not applied yet.</div>}
      {closed && (
        <div className="stage-closed">
          <StatusBadge status={status} />
          <span className="muted small">{reached >= 0 ? `after reaching ${STATUS_LABEL[STAGES[reached]].toLowerCase()}` : ""}</span>
        </div>
      )}
    </div>
  );
}
