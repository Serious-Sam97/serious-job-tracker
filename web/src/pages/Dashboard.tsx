import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, type Stats } from "../api";
import { STATUSES, STATUS_LABEL, UPDATE_TYPE_LABEL } from "../constants";
import { addDays, followUpState, fmtDateTime, pct, relativeDay, todayStr } from "../format";
import { Empty, ErrorBox, Spinner, StatusBadge } from "../components/ui";
import { StatusBars, WeeklyChart } from "../components/charts";

export default function Dashboard() {
  const { data: s, isPending, error } = useQuery({ queryKey: ["stats"], queryFn: api.stats });
  if (isPending) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  if (s.total === 0) {
    return (
      <div className="page">
        <Empty title="Welcome to your job tracker">
          <p>Add each job you apply to, log updates as things happen, and set follow-up dates so nothing slips.</p>
          <Link to="/applications/new" className="btn btn-primary">
            + Add your first application
          </Link>
        </Empty>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Dashboard</h1>
      </div>

      <div className="tiles">
        <Tile label="Active" value={s.active} hint="in progress, not closed" />
        <Tile label="Applied" value={s.applied} hint={`${s.byStatus.WISHLIST} more on wishlist`} />
        <Tile label="Response rate" value={pct(s.responseRate)} hint="got past “Applied”" />
        <Tile label="Interview rate" value={pct(s.interviewRate)} hint="reached interviews" />
        <Tile label="Offers" value={s.offers} hint={s.byStatus.ACCEPTED ? `${s.byStatus.ACCEPTED} accepted` : "offers + accepted"} />
      </div>

      <div className="dash-grid">
        <FollowUps followUps={s.followUps} />

        <section className="card">
          <h2 className="card-title">Applications per week</h2>
          <WeeklyChart weekly={s.weekly} />
        </section>

        <section className="card">
          <h2 className="card-title">Pipeline by status</h2>
          <StatusBars byStatus={s.byStatus} order={STATUSES} />
        </section>

        <section className="card">
          <h2 className="card-title">Recent activity</h2>
          {s.recent.length === 0 ? (
            <p className="muted">Nothing yet.</p>
          ) : (
            <ul className="activity">
              {s.recent.map((u) => (
                <li key={u.id}>
                  <Link to={`/applications/${u.application.id}`}>
                    <strong>{u.application.company}</strong>
                    <span className="muted"> · {UPDATE_TYPE_LABEL[u.type]}</span>
                  </Link>
                  <p className="activity-text">
                    {u.type === "STATUS_CHANGE" && u.toStatus
                      ? u.fromStatus
                        ? `${STATUS_LABEL[u.fromStatus]} → ${STATUS_LABEL[u.toStatus]}`
                        : `Added as ${STATUS_LABEL[u.toStatus]}`
                      : u.content}
                  </p>
                  <span className="muted small">{fmtDateTime(u.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="card tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      <div className="tile-hint muted small">{hint}</div>
    </div>
  );
}

function FollowUps({ followUps }: { followUps: Stats["followUps"] }) {
  const horizon = addDays(todayStr(), 14);
  const overdue = followUps.filter((a) => followUpState(a) === "overdue");
  const today = followUps.filter((a) => followUpState(a) === "today");
  const upcoming = followUps.filter((a) => followUpState(a) === "upcoming" && a.followUpAt!.slice(0, 10) <= horizon);

  const group = (title: string, items: typeof followUps, cls: string) =>
    items.length > 0 && (
      <div className={`fu-group ${cls}`}>
        <h3>
          {title} <span className="count">{items.length}</span>
        </h3>
        <ul>
          {items.map((a) => (
            <li key={a.id}>
              <Link to={`/applications/${a.id}`}>
                <span>
                  <strong>{a.company}</strong> <span className="muted">· {a.role}</span>
                </span>
                <span className="fu-when">
                  <StatusBadge status={a.status} />
                  <span className="small">{relativeDay(a.followUpAt!)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <section className="card followups-card">
      <h2 className="card-title">Follow-ups</h2>
      {overdue.length + today.length + upcoming.length === 0 ? (
        <p className="muted">Nothing due in the next two weeks. 🎉</p>
      ) : (
        <>
          {group("Overdue", overdue, "fu-overdue")}
          {group("Today", today, "fu-today")}
          {group("Next 14 days", upcoming, "fu-upcoming")}
        </>
      )}
    </section>
  );
}
