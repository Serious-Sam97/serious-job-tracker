import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { ContactLinks } from "../components/ContactsPanel";
import { Empty, ErrorBox, Spinner, StatusBadge } from "../components/ui";

export default function Contacts() {
  const { data, isPending, error } = useQuery({ queryKey: ["contacts"], queryFn: api.contacts });
  const [q, setQ] = useState("");

  if (isPending) return <Spinner />;
  if (error) return <ErrorBox error={error} />;

  const needle = q.trim().toLowerCase();
  const rows = needle
    ? data.filter((c) =>
        [c.name, c.title, c.email, c.application?.company].some((v) => v?.toLowerCase().includes(needle)),
      )
    : data;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Contacts</h1>
      </div>
      {data.length === 0 ? (
        <Empty title="No contacts yet">
          <p>Add recruiters and hiring managers from an application’s page.</p>
        </Empty>
      ) : (
        <>
          <div className="toolbar">
            <input
              type="search"
              className="search"
              placeholder="Search name, company, email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search contacts"
            />
          </div>
          <div className="contact-grid">
            {rows.map((c) => (
              <article key={c.id} className="card contact-card">
                <div className="contact-head">
                  <strong>{c.name}</strong>
                  {c.title && <span className="muted"> · {c.title}</span>}
                </div>
                <ContactLinks contact={c} />
                {c.notes && <p className="contact-notes">{c.notes}</p>}
                {c.application && (
                  <Link to={`/applications/${c.application.id}`} className="contact-app">
                    <span>
                      {c.application.company} <span className="muted">· {c.application.role}</span>
                    </span>
                    <StatusBadge status={c.application.status} />
                  </Link>
                )}
              </article>
            ))}
          </div>
          {rows.length === 0 && <Empty title="No contacts match" />}
        </>
      )}
    </div>
  );
}
