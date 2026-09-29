import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChartColumn, Columns3, ListTodo, Plus, Search, Sun, Users } from "lucide-react";
import { api } from "../api";
import { Avatar, StatusBadge } from "./ui";

interface Item {
  key: string;
  group: "Actions" | "Applications";
  label: string;
  hint?: ReactNode;
  icon: ReactNode;
  run: () => void;
}

const ALL = { q: "", sort: "updated", status: [] };

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const { data: apps = [] } = useQuery({ queryKey: ["applications", ALL], queryFn: () => api.list(ALL) });

  const go = (to: string) => () => {
    navigate(to);
    onClose();
  };

  const items = useMemo(() => {
    const actions: Item[] = [
      { key: "new", group: "Actions", label: "New application", icon: <Plus />, run: go("/applications/new") },
      { key: "today", group: "Actions", label: "Go to Today", icon: <Sun />, run: go("/") },
      { key: "apps", group: "Actions", label: "Go to Applications", icon: <ListTodo />, run: go("/applications") },
      { key: "board", group: "Actions", label: "Go to Board", icon: <Columns3 />, run: go("/board") },
      { key: "insights", group: "Actions", label: "Go to Insights", icon: <ChartColumn />, run: go("/insights") },
      { key: "contacts", group: "Actions", label: "Go to Contacts", icon: <Users />, run: go("/contacts") },
    ];
    const needle = query.trim().toLowerCase();
    const match = (s: string | null) => !!s && s.toLowerCase().includes(needle);
    const appItems: Item[] = apps
      .filter((a) => !needle || match(a.company) || match(a.role) || match(a.location))
      .slice(0, needle ? 20 : 6)
      .map((a) => ({
        key: `a${a.id}`,
        group: "Applications",
        label: a.company,
        hint: (
          <>
            <span className="muted small ellipsis" style={{ flex: 1 }}>
              {a.role}
            </span>
            <StatusBadge status={a.status} />
          </>
        ),
        icon: <Avatar name={a.company} />,
        run: go(`/applications/${a.id}`),
      }));
    const acts = needle ? actions.filter((a) => a.label.toLowerCase().includes(needle)) : actions;
    // With a query, applications are usually what you're after.
    return needle ? [...appItems, ...acts] : [...acts, ...appItems];
  }, [apps, query]);

  useEffect(() => setSel(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector(".palette-item.selected")?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") setSel((s) => Math.min(items.length - 1, s + 1));
    else if (e.key === "ArrowUp") setSel((s) => Math.max(0, s - 1));
    else if (e.key === "Enter") items[sel]?.run();
    else if (e.key === "Escape") onClose();
    else return;
    e.preventDefault();
  };

  return (
    <div className="palette-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={onKey}>
        <div className="palette-input">
          <Search />
          <input
            autoFocus
            placeholder="Search applications or jump to…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={items[sel] ? `pi-${items[sel].key}` : undefined}
          />
          <kbd>esc</kbd>
        </div>
        {items.length === 0 ? (
          <div className="palette-empty">No matches for “{query}”</div>
        ) : (
          <ul className="palette-list" id="palette-list" role="listbox" ref={listRef}>
            {items.map((it, i) => (
              <li key={it.key} role="presentation">
                {(i === 0 || items[i - 1].group !== it.group) && <div className="palette-group">{it.group}</div>}
                <div
                  id={`pi-${it.key}`}
                  role="option"
                  aria-selected={i === sel}
                  className={`palette-item${i === sel ? " selected" : ""}`}
                  onMouseMove={() => setSel(i)}
                  onClick={it.run}
                >
                  {it.icon}
                  <span style={{ fontWeight: 500 }}>{it.label}</span>
                  {it.hint}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
