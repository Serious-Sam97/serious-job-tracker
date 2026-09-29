import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useMatch, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, ListTodo, Plus, Search } from "lucide-react";
import { api, listQuery, type Status } from "../api";
import { CLOSED, STATUSES, STATUS_LABEL } from "../constants";
import { followUpState, sinceShort } from "../format";
import { Avatar, PriorityTag, Spinner, StatusBadge } from "../components/ui";

const OPEN = STATUSES.filter((s) => !CLOSED.includes(s));
const SORTS = { updated: "Recent activity", applied: "Date applied", followUp: "Follow-up", company: "Company", priority: "Priority" };

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
};

export default function Workspace() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const detail = useMatch("/applications/:id/*");
  const selectedId = detail && detail.params.id !== "new" ? Number(detail.params.id) : null;
  const isEdit = useMatch("/applications/:id/edit");

  const q = params.get("q") ?? "";
  const filter = params.get("filter") ?? "open";
  const sort = params.get("sort") ?? "updated";
  const [search, setSearch] = useState(q);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const setParam = (k: string, v: string | null) =>
    setParams(
      (p) => {
        if (v) p.set(k, v);
        else p.delete(k);
        return p;
      },
      { replace: true },
    );

  useEffect(() => {
    const t = setTimeout(() => search !== q && setParam("q", search.trim() || null), 200);
    return () => clearTimeout(t);
  }, [search]);

  const status: Status[] = filter === "open" ? OPEN : filter === "all" ? [] : [filter as Status];
  const listParams = { q, sort, status };
  const { data: apps, isPending } = useQuery({ queryKey: ["applications", listParams], queryFn: () => api.list(listParams) });

  // Keep the search params when moving between applications.
  const qs = params.toString() ? `?${params}` : "";
  const open = (id: number) => navigate(`/applications/${id}${qs}`);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e) || !apps) return;
      const idx = apps.findIndex((a) => a.id === selectedId);
      if (e.key === "j" || e.key === "ArrowDown") {
        const next = apps[Math.min(apps.length - 1, idx + 1)];
        if (next) open(next.id);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        const prev = apps[Math.max(0, idx - 1)];
        if (prev) open(prev.id);
      } else if (e.key === "/") {
        searchRef.current?.focus();
      } else if (e.key === "n") {
        navigate(`/applications/new${qs}`);
      } else if (e.key === "e" && selectedId && !isEdit) {
        navigate(`/applications/${selectedId}/edit${qs}`);
      } else if (e.key === "Escape" && selectedId) {
        navigate(`/applications${qs}`);
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Keep the selected row in view when navigating with the keyboard.
  useEffect(() => {
    listRef.current?.querySelector(".list-item.active")?.scrollIntoView({ block: "nearest" });
  }, [selectedId, apps]);

  return (
    <div className={`workspace${detail ? " has-detail" : ""}`}>
      <section className="list-pane" aria-label="Applications">
        <div className="list-head">
          <div className="list-head-top">
            <h1 className="list-title">Applications</h1>
            <Link to={`/applications/new${qs}`} className="btn btn-sm" title="New application (n)">
              <Plus /> New
            </Link>
          </div>
          <div className="search-wrap">
            <Search />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") e.currentTarget.blur();
                if (e.key === "Enter" && apps?.[0]) {
                  open(apps[0].id);
                  e.currentTarget.blur();
                }
              }}
              aria-label="Search applications"
            />
            {!search && <kbd>/</kbd>}
          </div>
          <div className="list-filters">
            <select value={filter} onChange={(e) => setParam("filter", e.target.value === "open" ? null : e.target.value)} aria-label="Filter by status">
              <option value="open">Open</option>
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setParam("sort", e.target.value === "updated" ? null : e.target.value)} aria-label="Sort">
              {Object.entries(SORTS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isPending ? (
          <Spinner />
        ) : !apps?.length ? (
          <div className="list-empty">
            {q || filter !== "open" ? "Nothing matches." : "No open applications yet."}
          </div>
        ) : (
          <ul className="list" ref={listRef}>
            {apps.map((a) => {
              const fu = followUpState(a);
              return (
                <li
                  key={a.id}
                  className={`list-item${a.id === selectedId ? " active" : ""}`}
                  onClick={() => open(a.id)}
                  onKeyDown={(e) => e.key === "Enter" && open(a.id)}
                  tabIndex={0}
                  aria-current={a.id === selectedId ? "true" : undefined}
                >
                  <Avatar name={a.company} />
                  <div style={{ minWidth: 0 }}>
                    <div className="li-company">
                      <span className="ellipsis">{a.company}</span>
                      <PriorityTag priority={a.priority} />
                      {(fu === "overdue" || fu === "today") && (
                        <span className={`li-alert${fu === "today" ? " today" : ""}`} title={`Follow-up ${fu === "today" ? "due today" : "overdue"}`} />
                      )}
                    </div>
                    <div className="li-role ellipsis">{a.role}</div>
                  </div>
                  <div className="li-right">
                    <StatusBadge status={a.status} />
                    <span className="li-time" title={`Last activity ${new Date(a.updatedAt).toLocaleString()}`}>
                      {sinceShort(a.updatedAt)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="list-foot">
          <span>
            {apps?.length ?? 0} shown · <kbd>j</kbd> <kbd>k</kbd> to move
          </span>
          <a href={`/api/applications/export.csv${listQuery(listParams)}`} download title="Export these as CSV">
            <Download size={13} style={{ verticalAlign: "-2px" }} /> CSV
          </a>
        </div>
      </section>

      <section className="detail-pane">
        <Outlet />
      </section>
    </div>
  );
}

export function PaneEmpty() {
  return (
    <div className="pane-empty">
      <div>
        <ListTodo size={28} strokeWidth={1.5} />
        <div className="pane-empty-title">Pick an application</div>
        <p>Select one from the list, or add a new one.</p>
        <div className="keys">
          <span>
            <kbd>j</kbd> <kbd>k</kbd> move
          </span>
          <span>
            <kbd>/</kbd> search
          </span>
          <span>
            <kbd>n</kbd> new
          </span>
          <span>
            <kbd>e</kbd> edit
          </span>
        </div>
      </div>
    </div>
  );
}
