import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, listQuery, type Status } from "../api";
import { STATUSES, STATUS_LABEL, WORK_MODE_LABEL } from "../constants";
import { fmtDate } from "../format";
import { Empty, ErrorBox, FollowUp, PriorityTag, Spinner, StatusBadge } from "../components/ui";
import Board from "../components/Board";

const SORTS = { updated: "Recently updated", applied: "Date applied", followUp: "Follow-up date", company: "Company", priority: "Priority" };

function savedView(): string {
  try {
    return localStorage.getItem("jt.view") ?? "table";
  } catch {
    return "table";
  }
}

export default function Applications() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const view = params.get("view") ?? savedView();
  const q = params.get("q") ?? "";
  const sort = params.get("sort") ?? "updated";
  const statusFilter = (params.get("status")?.split(",").filter(Boolean) ?? []) as Status[];
  const [search, setSearch] = useState(q);

  const update = (changes: Record<string, string | null>) =>
    setParams(
      (p) => {
        for (const [k, v] of Object.entries(changes)) {
          if (v) p.set(k, v);
          else p.delete(k);
        }
        return p;
      },
      { replace: true },
    );

  // Debounce the search box into the URL.
  useEffect(() => {
    const t = setTimeout(() => search !== q && update({ q: search.trim() || null }), 250);
    return () => clearTimeout(t);
  }, [search]);

  const setView = (v: string) => {
    try {
      localStorage.setItem("jt.view", v);
    } catch {}
    update({ view: v });
  };

  // The board shows every status as columns, so it ignores the status filter.
  const listParams = { q, sort, status: view === "board" ? [] : statusFilter };
  const queryKey = ["applications", listParams];
  const { data: apps, isPending, error } = useQuery({ queryKey, queryFn: () => api.list(listParams) });

  const toggleStatus = (s: Status) => {
    const next = statusFilter.includes(s) ? statusFilter.filter((x) => x !== s) : [...statusFilter, s];
    update({ status: next.join(",") || null });
  };

  return (
    <div className={`page${view === "board" ? " page-wide" : ""}`}>
      <div className="page-head">
        <h1>Applications</h1>
        <div className="head-actions">
          <a className="btn btn-ghost" href={`/api/applications/export.csv${listQuery(listParams)}`} download>
            Export CSV
          </a>
          <Link to="/applications/new" className="btn btn-primary">
            + New application
          </Link>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="Search company, role, location, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search"
        />
        {view === "table" && (
          <select value={sort} onChange={(e) => update({ sort: e.target.value === "updated" ? null : e.target.value })} aria-label="Sort">
            {Object.entries(SORTS).map(([v, l]) => (
              <option key={v} value={v}>
                Sort: {l}
              </option>
            ))}
          </select>
        )}
        <div className="segmented" role="tablist" aria-label="View">
          <button role="tab" aria-selected={view === "table"} className={view === "table" ? "active" : ""} onClick={() => setView("table")}>
            ☰ Table
          </button>
          <button role="tab" aria-selected={view === "board"} className={view === "board" ? "active" : ""} onClick={() => setView("board")}>
            ▦ Board
          </button>
        </div>
      </div>

      {view === "table" && (
        <div className="chip-row filters">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`chip status-${s.toLowerCase()}${statusFilter.includes(s) ? " active" : ""}`}
              onClick={() => toggleStatus(s)}
              aria-pressed={statusFilter.includes(s)}
            >
              <span className="dot" aria-hidden />
              {STATUS_LABEL[s]}
            </button>
          ))}
          {statusFilter.length > 0 && (
            <button className="link-btn" onClick={() => update({ status: null })}>
              Clear
            </button>
          )}
        </div>
      )}

      {isPending ? (
        <Spinner />
      ) : error ? (
        <ErrorBox error={error} />
      ) : apps.length === 0 && !q && !statusFilter.length ? (
        <Empty title="No applications yet">
          <p>Add the first job you applied to and start tracking it.</p>
          <Link to="/applications/new" className="btn btn-primary">
            + New application
          </Link>
        </Empty>
      ) : view === "board" ? (
        <Board apps={apps} queryKey={queryKey} />
      ) : apps.length === 0 ? (
        <Empty title="Nothing matches these filters" />
      ) : (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Company / role</th>
                <th>Status</th>
                <th className="hide-sm">Location</th>
                <th className="hide-sm">Applied</th>
                <th>Follow-up</th>
                <th className="hide-sm num">Updates</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id} onClick={() => navigate(`/applications/${a.id}`)} className="row-link">
                  <td>
                    <Link to={`/applications/${a.id}`} className="cell-title" onClick={(e) => e.stopPropagation()}>
                      {a.company}
                    </Link>{" "}
                    <PriorityTag priority={a.priority} />
                    <div className="muted small">{a.role}</div>
                  </td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="hide-sm">
                    {a.location ?? ""}
                    {a.workMode && <div className="muted small">{WORK_MODE_LABEL[a.workMode]}</div>}
                  </td>
                  <td className="hide-sm nowrap">{fmtDate(a.appliedAt)}</td>
                  <td className="nowrap">
                    <FollowUp app={a} withDate={false} />
                  </td>
                  <td className="hide-sm num">{a._count?.updates ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-foot muted small">
            {apps.length} application{apps.length === 1 ? "" : "s"}
          </div>
        </div>
      )}
    </div>
  );
}
