import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlarmClock, ArrowRight, Mail, MessageSquare, Mic, PhoneCall, Repeat, StickyNote, type LucideIcon } from "lucide-react";
import { api, type Update, type UpdateType } from "../api";
import { UPDATE_TYPE_LABEL } from "../constants";
import { fmtDateTime, relativeDay, toDateInput, todayStr } from "../format";
import { StatusBadge } from "./ui";
import { useToast } from "./Toast";

const MANUAL_TYPES = (Object.keys(UPDATE_TYPE_LABEL) as UpdateType[]).filter((t) => t !== "STATUS_CHANGE");

const TYPE_ICON: Record<UpdateType, LucideIcon> = {
  NOTE: StickyNote,
  STATUS_CHANGE: Repeat,
  INTERVIEW: Mic,
  EMAIL: Mail,
  CALL: PhoneCall,
  FOLLOW_UP: AlarmClock,
  OTHER: MessageSquare,
};

const PLACEHOLDER: Partial<Record<UpdateType, string>> = {
  NOTE: "What happened? e.g. recruiter replied, sent portfolio…",
  INTERVIEW: "Who, what kind of interview — set a future date to schedule it",
  EMAIL: "Summary of the email",
  CALL: "Who called and what was said",
  FOLLOW_UP: "How you followed up",
};

export default function Timeline({ appId, updates }: { appId: number; updates: Update[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [type, setType] = useState<UpdateType>("NOTE");
  const [date, setDate] = useState(todayStr());
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState<number | null>(null);

  const onError = (e: Error) => toast(e.message, "error");
  const add = useMutation({
    mutationFn: () => api.addUpdate(appId, { type, content, date: date === todayStr() ? null : date }),
    onSuccess: () => {
      setContent("");
      setType("NOTE");
      setDate(todayStr());
      qc.invalidateQueries();
    },
    onError,
  });
  const remove = useMutation({ mutationFn: api.removeUpdate, onSuccess: () => qc.invalidateQueries(), onError });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (content.trim()) add.mutate();
  };

  const sorted = [...updates].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const today = todayStr();

  return (
    <section>
      <h2 className="section-title">Timeline</h2>
      <form className="composer" onSubmit={submit}>
        <textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={PLACEHOLDER[type] ?? "Add an update"}
          aria-label="New update"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
          }}
        />
        <div className="composer-bar">
          <select value={type} onChange={(e) => setType(e.target.value as UpdateType)} aria-label="Update type">
            {MANUAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {UPDATE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
          <span className="grow" />
          <span className="muted small">⌘↵</span>
          <button className="btn btn-sm btn-primary" disabled={!content.trim() || add.isPending}>
            Add
          </button>
        </div>
      </form>

      {sorted.length === 0 ? (
        <p className="muted">No updates yet.</p>
      ) : (
        <ol className="timeline">
          {sorted.map((u) => {
            const Icon = TYPE_ICON[u.type];
            const day = u.date.slice(0, 10);
            const upcoming = day > today || (u.type === "INTERVIEW" && day === today);
            return (
              <li key={u.id} className={`tl-item tl-${u.type.toLowerCase()}${u.toStatus ? ` status-${u.toStatus.toLowerCase()}` : ""}`}>
                <span className="tl-icon" aria-hidden>
                  <Icon />
                </span>
                <div className="tl-body">
                  {editing === u.id ? (
                    <EditUpdate update={u} onDone={() => setEditing(null)} />
                  ) : (
                    <>
                      <div className="tl-meta">
                        <span className="tl-type">{UPDATE_TYPE_LABEL[u.type]}</span>
                        <span>{fmtDateTime(u.date)}</span>
                        {upcoming && <span className="tl-soon">{day === today ? "Today" : `Upcoming · ${relativeDay(u.date)}`}</span>}
                        <span className="tl-actions">
                          {u.type !== "STATUS_CHANGE" && (
                            <button className="link-btn" onClick={() => setEditing(u.id)}>
                              Edit
                            </button>
                          )}
                          <button className="link-btn danger" onClick={() => confirm("Delete this update?") && remove.mutate(u.id)}>
                            Delete
                          </button>
                        </span>
                      </div>
                      {u.type === "STATUS_CHANGE" && u.toStatus ? (
                        <div className="tl-status">
                          {u.fromStatus ? (
                            <>
                              <StatusBadge status={u.fromStatus} />
                              <ArrowRight />
                            </>
                          ) : (
                            <span className="muted small">Added as</span>
                          )}
                          <StatusBadge status={u.toStatus} />
                        </div>
                      ) : (
                        <p className="tl-content">{u.content}</p>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function EditUpdate({ update, onDone }: { update: Update; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [content, setContent] = useState(update.content);
  const [type, setType] = useState(update.type);
  const [date, setDate] = useState(toDateInput(update.date));
  const save = useMutation({
    mutationFn: () =>
      api.patchUpdate(update.id, {
        content,
        type,
        // Keep the original timestamp unless the day was actually changed.
        ...(date !== toDateInput(update.date) && { date }),
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      onDone();
    },
    onError: (e) => toast(e.message, "error"),
  });
  return (
    <form
      className="tl-edit"
      onSubmit={(e) => {
        e.preventDefault();
        if (content.trim()) save.mutate();
      }}
    >
      <textarea rows={2} value={content} onChange={(e) => setContent(e.target.value)} autoFocus aria-label="Update text" />
      <div className="tl-edit-bar">
        <select value={type} onChange={(e) => setType(e.target.value as UpdateType)} aria-label="Update type">
          {MANUAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {UPDATE_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
        <button type="button" className="btn btn-sm btn-quiet" onClick={onDone}>
          Cancel
        </button>
        <button className="btn btn-sm btn-primary" disabled={!content.trim() || save.isPending}>
          Save
        </button>
      </div>
    </form>
  );
}
