import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Update, type UpdateType } from "../api";
import { STATUS_LABEL, UPDATE_TYPE_LABEL } from "../constants";
import { fmtDateTime, toDateInput, todayStr } from "../format";
import { useToast } from "./Toast";

const MANUAL_TYPES = (Object.keys(UPDATE_TYPE_LABEL) as UpdateType[]).filter((t) => t !== "STATUS_CHANGE");

const TYPE_ICON: Record<UpdateType, string> = {
  NOTE: "✎",
  STATUS_CHANGE: "→",
  INTERVIEW: "◎",
  EMAIL: "✉",
  CALL: "☏",
  FOLLOW_UP: "↻",
  OTHER: "•",
};

export default function Timeline({ appId, updates }: { appId: number; updates: Update[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [type, setType] = useState<UpdateType>("NOTE");
  const [date, setDate] = useState(todayStr());
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState<number | null>(null);

  const onError = (e: Error) => toast(e.message, "error");
  const done = () => qc.invalidateQueries();

  const add = useMutation({
    mutationFn: () => api.addUpdate(appId, { type, content, date: date === todayStr() ? null : date }),
    onSuccess: () => {
      setContent("");
      setType("NOTE");
      setDate(todayStr());
      done();
    },
    onError,
  });
  const remove = useMutation({ mutationFn: api.removeUpdate, onSuccess: done, onError });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (content.trim()) add.mutate();
  };

  // Newest first; a date-only entry sorts by its day, before timed entries of that same day.
  const sorted = [...updates].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  return (
    <section className="card">
      <h2 className="card-title">Timeline</h2>
      <form className="add-update" onSubmit={submit}>
        <textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add an update — e.g. “Recruiter replied, tech interview Thursday”"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
          }}
        />
        <div className="add-update-row">
          <select value={type} onChange={(e) => setType(e.target.value as UpdateType)} aria-label="Update type">
            {MANUAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {UPDATE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
          <button className="btn btn-primary btn-sm" disabled={!content.trim() || add.isPending}>
            Add update
          </button>
        </div>
      </form>

      {sorted.length === 0 ? (
        <p className="muted">No updates yet.</p>
      ) : (
        <ol className="timeline">
          {sorted.map((u) => (
            <li key={u.id} className={`tl-item tl-${u.type.toLowerCase()}`}>
              <span className="tl-icon" aria-hidden>
                {TYPE_ICON[u.type]}
              </span>
              <div className="tl-body">
                {editing === u.id ? (
                  <EditUpdate update={u} onDone={() => setEditing(null)} />
                ) : (
                  <>
                    <div className="tl-meta">
                      <span className="tl-type">{UPDATE_TYPE_LABEL[u.type]}</span>
                      <span className="muted">{fmtDateTime(u.date)}</span>
                      <span className="tl-actions">
                        {u.type !== "STATUS_CHANGE" && (
                          <button className="link-btn" onClick={() => setEditing(u.id)}>
                            Edit
                          </button>
                        )}
                        <button
                          className="link-btn danger"
                          onClick={() => confirm("Delete this update?") && remove.mutate(u.id)}
                        >
                          Delete
                        </button>
                      </span>
                    </div>
                    <p className="tl-content">
                      {u.type === "STATUS_CHANGE" && u.toStatus
                        ? u.fromStatus
                          ? `${STATUS_LABEL[u.fromStatus]} → ${STATUS_LABEL[u.toStatus]}`
                          : `Added as ${STATUS_LABEL[u.toStatus]}`
                        : u.content}
                    </p>
                  </>
                )}
              </div>
            </li>
          ))}
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
      className="add-update"
      onSubmit={(e) => {
        e.preventDefault();
        if (content.trim()) save.mutate();
      }}
    >
      <textarea rows={2} value={content} onChange={(e) => setContent(e.target.value)} autoFocus />
      <div className="add-update-row">
        <select value={type} onChange={(e) => setType(e.target.value as UpdateType)} aria-label="Update type">
          {MANUAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {UPDATE_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>
          Cancel
        </button>
        <button className="btn btn-primary btn-sm" disabled={!content.trim() || save.isPending}>
          Save
        </button>
      </div>
    </form>
  );
}
