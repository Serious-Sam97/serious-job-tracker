import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlarmClock, CalendarClock, Check, CircleCheck, Ghost, Mic, Plus } from "lucide-react";
import { api, type ApplicationInput } from "../api";
import { STATUS_LABEL } from "../constants";
import { addDays, dayLabel, daysSince, greeting, relativeDay, todayStr } from "../format";
import { useToday, type NeedsYou } from "../hooks";
import { ErrorBox, Spinner, StatusBadge } from "../components/ui";
import { useToast } from "../components/Toast";

export default function Today() {
  const { data, isPending, error, needsYou, comingUp } = useToday();
  if (isPending) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  const dateLine = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const fresh = data.active === 0 && data.followUps.length === 0 && data.appliedThisWeek === 0;
  const n = needsYou.length;

  return (
    <div className="page">
      <header className="today-head">
        <div>
          <div className="today-date">{dateLine}</div>
          <h1 className="today-greeting">{greeting()}.</h1>
          <p className="today-summary">
            {fresh ? (
              "Let’s get your search organized."
            ) : n ? (
              <>
                <strong>
                  {n} {n === 1 ? "thing needs" : "things need"} you
                </strong>{" "}
                today, across {data.active} active application{data.active === 1 ? "" : "s"}.
              </>
            ) : (
              `You’re all caught up — ${data.active} active application${data.active === 1 ? "" : "s"} in flight.`
            )}
          </p>
        </div>
        <WeeklyGoal done={data.appliedThisWeek} goal={data.weeklyGoal} />
      </header>

      <div className="today-grid">
        <section>
          <h2 className="section-title">
            Needs you {n > 0 && <span className="count">{n}</span>}
          </h2>
          {fresh ? (
            <div className="card all-clear">
              <div className="all-clear-title">Add the first job you applied to</div>
              <p className="muted">Each application gets a timeline, contacts and follow-up reminders. They’ll show up here when they need you.</p>
              <Link to="/applications/new" className="btn btn-primary">
                <Plus /> New application
              </Link>
            </div>
          ) : n === 0 ? (
            <div className="card all-clear">
              <CircleCheck />
              <div className="all-clear-title">Nothing needs you today</div>
              <p className="muted">A good day to send a few more applications.</p>
            </div>
          ) : (
            <ul className="inbox">
              {needsYou.map((item) => (
                <InboxItem key={item.key} item={item} staleDays={data.staleDays} />
              ))}
            </ul>
          )}
        </section>

        <aside className="today-side">
          <section>
            <h2 className="section-title">Coming up</h2>
            {comingUp.length === 0 ? (
              <p className="muted">Nothing scheduled in the next two weeks. Log interviews on an application’s timeline with a future date and they’ll appear here.</p>
            ) : (
              <ul className="agenda">
                {comingUp.map((c, i) => (
                  <li key={c.key}>
                    {(i === 0 || comingUp[i - 1].date !== c.date) && <div className="agenda-day">{dayLabel(c.date)}</div>}
                    {c.kind === "interview" ? (
                      <Link to={`/applications/${c.interview.application.id}`} className="agenda-row kind-interview">
                        <Mic />
                        <span>
                          <strong>{c.interview.application.company}</strong> · interview
                          <div className="muted small ellipsis">{c.interview.content}</div>
                        </span>
                      </Link>
                    ) : (
                      <Link to={`/applications/${c.app.id}`} className="agenda-row">
                        <AlarmClock />
                        <span>
                          <strong>{c.app.company}</strong> · follow up
                          <div className="muted small ellipsis">{c.app.role}</div>
                        </span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div className="mini-stats">
            <div className="mini-stat">
              <div className="mini-stat-value num">{data.active}</div>
              <div className="mini-stat-label">Active applications</div>
            </div>
            <Link to="/insights" className="mini-stat">
              <div className="mini-stat-value num">{data.appliedThisWeek}</div>
              <div className="mini-stat-label">Applied this week →</div>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function InboxItem({ item, staleDays }: { item: NeedsYou; staleDays: number }) {
  const qc = useQueryClient();
  const toast = useToast();
  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => qc.invalidateQueries(),
    onError: (e) => toast(e.message, "error"),
  });
  const patch = (id: number, data: ApplicationInput, msg: string) =>
    run.mutate(() => api.patch(id, data).then(() => toast(msg)));

  if (item.kind === "interview") {
    const { application: app, content } = item.interview;
    return (
      <li className="inbox-item tone-accent">
        <span className="inbox-icon">
          <Mic />
        </span>
        <div>
          <div className="inbox-title">
            Interview with <Link to={`/applications/${app.id}`}>{app.company}</Link> today
          </div>
          <div className="inbox-meta">{content}</div>
          <div className="inbox-actions">
            <Link to={`/applications/${app.id}`} className="btn btn-sm">
              Open application
            </Link>
          </div>
        </div>
      </li>
    );
  }

  if (item.kind === "followup") {
    const { app, overdue } = item;
    return (
      <li className={`inbox-item ${overdue ? "tone-danger" : "tone-warn"}`}>
        <span className="inbox-icon">
          <AlarmClock />
        </span>
        <div>
          <div className="inbox-title">
            Follow up with <Link to={`/applications/${app.id}`}>{app.company}</Link>
          </div>
          <div className="inbox-meta">
            <span className="ellipsis">{app.role}</span> · {overdue ? `due ${relativeDay(app.followUpAt!)}` : "due today"} ·{" "}
            {STATUS_LABEL[app.status]}
          </div>
          <div className="inbox-actions">
            <button
              className="btn btn-sm btn-primary"
              disabled={run.isPending}
              onClick={() =>
                run.mutate(async () => {
                  await api.addUpdate(app.id, { type: "FOLLOW_UP", content: "Followed up" });
                  await api.patch(app.id, { followUpAt: null });
                  toast(`Follow-up with ${app.company} logged`);
                })
              }
            >
              <Check /> I followed up
            </button>
            <button
              className="btn btn-sm"
              disabled={run.isPending}
              onClick={() => patch(app.id, { followUpAt: addDays(todayStr(), 3) }, `Snoozed ${app.company} for 3 days`)}
            >
              Snooze 3 days
            </button>
          </div>
        </div>
      </li>
    );
  }

  const { app } = item;
  return (
    <li className="inbox-item">
      <span className="inbox-icon">
        <Ghost />
      </span>
      <div>
        <div className="inbox-title">
          <Link to={`/applications/${app.id}`}>{app.company}</Link> has gone quiet
        </div>
        <div className="inbox-meta">
          No activity for {daysSince(app.updatedAt)} days (over {staleDays}) · <StatusBadge status={app.status} />
        </div>
        <div className="inbox-actions">
          <button className="btn btn-sm" disabled={run.isPending} onClick={() => patch(app.id, { followUpAt: todayStr() }, `Follow-up with ${app.company} added for today`)}>
            <AlarmClock /> Follow up today
          </button>
          <button className="btn btn-sm" disabled={run.isPending} onClick={() => patch(app.id, { followUpAt: addDays(todayStr(), 7) }, `We’ll remind you about ${app.company} in a week`)}>
            <CalendarClock /> Remind me in a week
          </button>
          <button className="btn btn-sm btn-quiet" disabled={run.isPending} onClick={() => patch(app.id, { status: "GHOSTED" }, `${app.company} marked as ghosted`)}>
            <Ghost /> Mark ghosted
          </button>
        </div>
      </div>
    </li>
  );
}

function WeeklyGoal({ done, goal }: { done: number; goal: number }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(goal));
  const save = useMutation({
    mutationFn: (g: number) => api.saveSettings({ weeklyGoal: g }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["today"] }),
    onError: (e) => toast(e.message, "error"),
  });
  const commit = () => {
    setEditing(false);
    const g = Number(value);
    if (Number.isInteger(g) && g >= 0 && g !== goal) save.mutate(g);
    else setValue(String(goal));
  };
  const pctDone = goal ? Math.min(100, (done / goal) * 100) : 0;

  return (
    <div className="goal card">
      <div className="goal-top">
        <span className="section-title" style={{ margin: 0 }}>
          This week
        </span>
        {editing ? (
          <input
            className="goal-edit"
            type="number"
            min={0}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setValue(String(goal));
                setEditing(false);
              }
            }}
            aria-label="Weekly goal"
          />
        ) : (
          <button className="link-btn" onClick={() => setEditing(true)}>
            Goal: {goal}
          </button>
        )}
      </div>
      <div className="goal-num num">
        {done} <small>/ {goal} applications</small>
      </div>
      <div className="goal-track" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={goal}>
        <div className={`goal-fill${goal && done >= goal ? " done" : ""}`} style={{ width: `${pctDone}%` }} />
      </div>
    </div>
  );
}
