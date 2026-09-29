import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Banknote, CalendarDays, Check, ExternalLink, MapPin, Pencil, Radio, Trash2 } from "lucide-react";
import { api, type ApplicationInput, type Priority, type Status } from "../api";
import { PRIORITY_LABEL, STATUSES, STATUS_LABEL, WORK_MODE_LABEL } from "../constants";
import { addDays, fmtDate, fmtSalary, toDateInput, todayStr } from "../format";
import { Avatar, ErrorBox, FollowUp, PriorityTag, Spinner } from "../components/ui";
import Timeline from "../components/Timeline";
import ContactsPanel from "../components/ContactsPanel";
import StageBar from "../components/StageBar";
import { useToast } from "../components/Toast";

export default function ApplicationDetail() {
  const id = Number(useParams().id);
  const [params] = useSearchParams();
  const qs = params.toString() ? `?${params}` : "";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [showDesc, setShowDesc] = useState(false);
  const { data: app, isPending, error } = useQuery({ queryKey: ["application", id], queryFn: () => api.get(id) });

  const onError = (e: Error) => toast(e.message, "error");
  const patch = useMutation({
    mutationFn: (data: ApplicationInput) => api.patch(id, data),
    onSuccess: () => qc.invalidateQueries(),
    onError,
  });
  const followedUp = useMutation({
    mutationFn: async () => {
      await api.addUpdate(id, { type: "FOLLOW_UP", content: "Followed up" });
      await api.patch(id, { followUpAt: null });
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast("Follow-up logged");
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: () => api.remove(id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["application", id] });
      qc.invalidateQueries();
      toast("Application deleted");
      navigate(`/applications${qs}`);
    },
    onError,
  });

  if (isPending) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  const setStatus = (status: Status) => {
    const data: ApplicationInput = { status };
    if (app.status === "WISHLIST" && !app.appliedAt) data.appliedAt = todayStr();
    patch.mutate(data);
  };
  const salary = fmtSalary(app);
  const setFollowUp = (days: number) => patch.mutate({ followUpAt: addDays(todayStr(), days) });

  return (
    <div className="pane-inner">
      <Link to={`/applications${qs}`} className="back">
        <ArrowLeft /> Applications
      </Link>

      <header className="detail-head">
        <Avatar name={app.company} size="lg" />
        <div style={{ minWidth: 0 }}>
          <h1 className="detail-company">
            {app.company} <PriorityTag priority={app.priority} />
          </h1>
          <div className="detail-role">{app.role}</div>
          <div className="detail-meta">
            {(app.location || app.workMode) && (
              <span>
                <MapPin />
                {[app.location, app.workMode && WORK_MODE_LABEL[app.workMode]].filter(Boolean).join(" · ")}
              </span>
            )}
            {salary && (
              <span>
                <Banknote />
                {salary}
              </span>
            )}
            {app.appliedAt && (
              <span>
                <CalendarDays />
                Applied {fmtDate(app.appliedAt)}
              </span>
            )}
            {app.source && (
              <span>
                <Radio />
                {app.source}
              </span>
            )}
            {app.url && (
              <a href={app.url} target="_blank" rel="noreferrer">
                <ExternalLink />
                Job posting
              </a>
            )}
          </div>
        </div>
        <div className="head-actions">
          <Link to={`/applications/${id}/edit${qs}`} className="btn btn-sm" title="Edit (e)">
            <Pencil /> Edit
          </Link>
          <button
            className="btn btn-sm btn-quiet btn-icon danger"
            aria-label="Delete application"
            title="Delete"
            onClick={() => confirm(`Delete ${app.company} — ${app.role}? This removes its timeline and contacts too.`) && remove.mutate()}
          >
            <Trash2 />
          </button>
        </div>
      </header>

      <StageBar status={app.status} updates={app.updates} />

      <div className="controls">
        <label className="control">
          <span className="control-label">Status</span>
          <select value={app.status} onChange={(e) => setStatus(e.target.value as Status)} disabled={patch.isPending}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="control">
          <span className="control-label">Priority</span>
          <select value={app.priority} onChange={(e) => patch.mutate({ priority: e.target.value as Priority })}>
            {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <div className="control">
          <span className="control-label">
            Follow up {app.followUpAt && <FollowUp app={app} withDate={false} />}
          </span>
          <input
            type="date"
            aria-label="Follow-up date"
            value={toDateInput(app.followUpAt)}
            onChange={(e) => patch.mutate({ followUpAt: e.target.value || null })}
          />
          <div className="chip-row">
            {app.followUpAt ? (
              <>
                <button className="btn btn-sm btn-primary" onClick={() => followedUp.mutate()} disabled={followedUp.isPending}>
                  <Check /> Done
                </button>
                <button className="btn btn-sm btn-quiet" onClick={() => setFollowUp(3)}>
                  +3d
                </button>
                <button className="btn btn-sm btn-quiet" onClick={() => patch.mutate({ followUpAt: null })}>
                  Clear
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-sm btn-quiet" onClick={() => setFollowUp(3)}>
                  3 days
                </button>
                <button className="btn btn-sm btn-quiet" onClick={() => setFollowUp(7)}>
                  1 week
                </button>
                <button className="btn btn-sm btn-quiet" onClick={() => setFollowUp(14)}>
                  2 weeks
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="detail-cols">
        <Timeline appId={id} updates={app.updates} />

        <div className="detail-side">
          {app.notes && (
            <section>
              <h2 className="section-title">Notes</h2>
              <p className="prewrap notes">{app.notes}</p>
            </section>
          )}
          <ContactsPanel appId={id} contacts={app.contacts} />
          {app.description && (
            <section>
              <div className="card-title-row">
                <h2 className="section-title">Job description</h2>
                <button className="link-btn" onClick={() => setShowDesc((v) => !v)}>
                  {showDesc ? "Show less" : "Show all"}
                </button>
              </div>
              <p className={`prewrap description${showDesc ? "" : " clamped"}`}>{app.description}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
