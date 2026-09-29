import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Status } from "../api";
import { STATUS_LABEL } from "../constants";

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });

// Column chart: one series, applications per week. Hover shows the exact week + count.
export function WeeklyChart({ weekly }: { weekly: { week: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...weekly.map((w) => w.count));
  // Clean y-axis top: next "nice" integer so the tallest bar isn't flush with the frame.
  const top = max <= 4 ? max : Math.ceil(max / 5) * 5;
  const total = weekly.reduce((a, w) => a + w.count, 0);

  return (
    <figure className="chart">
      <div className="columns" onMouseLeave={() => setHover(null)}>
        {weekly.map((w, i) => (
          <div
            key={w.week}
            className={`col-slot${hover === i ? " hover" : ""}`}
            onMouseEnter={() => setHover(i)}
            tabIndex={0}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            aria-label={`Week of ${shortDate(w.week)}: ${w.count} applications`}
          >
            <div className="col-area">
              {w.count > 0 && <span className="col-value">{w.count}</span>}
              <div className="col-bar" style={{ height: `${(w.count / top) * 100}%` }} />
            </div>
            <span className="col-label">{i % 2 === weekly.length % 2 ? shortDate(w.week) : ""}</span>
            {hover === i && (
              <div className={`tooltip${i > weekly.length / 2 ? " tooltip-left" : ""}`} role="tooltip">
                <div className="muted small">Week of {shortDate(w.week)}</div>
                <strong>
                  {w.count} application{w.count === 1 ? "" : "s"}
                </strong>
              </div>
            )}
          </div>
        ))}
      </div>
      <figcaption className="muted small">
        {total} applications in the last {weekly.length} weeks
      </figcaption>
    </figure>
  );
}

// Horizontal bars: current count per status. Click a bar to open the filtered list.
export function StatusBars({ byStatus, order }: { byStatus: Record<Status, number>; order: Status[] }) {
  const navigate = useNavigate();
  const max = Math.max(1, ...order.map((s) => byStatus[s]));
  return (
    <div className="hbars">
      {order.map((s) => (
        <button
          key={s}
          className="hbar-row"
          onClick={() => navigate(`/applications?filter=${s}`)}
          title={`${STATUS_LABEL[s]}: ${byStatus[s]} — click to view`}
        >
          <span className="hbar-label">
            <span className={`dot status-${s.toLowerCase()}`} aria-hidden />
            {STATUS_LABEL[s]}
          </span>
          <span className="hbar-track">
            <span className="hbar" style={{ width: `${(byStatus[s] / max) * 100}%` }} />
            <span className="hbar-value">{byStatus[s]}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
