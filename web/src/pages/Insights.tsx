import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { STATUSES, STATUS_LABEL, UPDATE_TYPE_LABEL } from "../constants";
import { fmtDateTime, pct } from "../format";
import { Empty, ErrorBox, Spinner } from "../components/ui";
import { StatusBars, WeeklyChart } from "../components/charts";

export default function Insights() {
  const { data: s, isPending, error } = useQuery({ queryKey: ["stats"], queryFn: api.stats });
  if (isPending) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  if (s.total === 0) {
    return (
      <div className="page">
        <Empty title="No insights yet">
          <p>Once you’ve added a few applications, you’ll see your response rates and weekly pace here.</p>
          <Link to="/applications/new" className="btn btn-primary">
            New application
          </Link>
        </Empty>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Insights</h1>
          <p className="page-sub">How your search is going, all time.</p>
        </div>
      </div>

      <div className="tiles">
        <Tile label="Active" value={s.active} hint="in progress" />
        <Tile label="Applied" value={s.applied} hint={`${s.byStatus.WISHLIST} more on wishlist`} />
        <Tile label="Response rate" value={pct(s.responseRate)} hint="got past “Applied”" />
        <Tile label="Interview rate" value={pct(s.interviewRate)} hint="reached interviews" />
        <Tile label="Offers" value={s.offers} hint={s.byStatus.ACCEPTED ? `${s.byStatus.ACCEPTED} accepted` : "offers + accepted"} />
      </div>

      <div className="dash-grid">
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
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      <div className="tile-hint muted small">{hint}</div>
    </div>
  );
}
