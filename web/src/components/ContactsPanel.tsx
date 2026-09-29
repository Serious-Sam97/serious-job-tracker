import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Mail, Phone } from "lucide-react";
import { api, type Contact, type ContactInput } from "../api";
import { useToast } from "./Toast";

const EMPTY = { name: "", title: "", email: "", phone: "", linkedin: "", notes: "" };

export default function ContactsPanel({ appId, contacts }: { appId: number; contacts: Contact[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const remove = useMutation({
    mutationFn: api.removeContact,
    onSuccess: () => qc.invalidateQueries(),
    onError: (e) => toast(e.message, "error"),
  });

  return (
    <section>
      <div className="card-title-row">
        <h2 className="section-title">Contacts</h2>
        {editing !== "new" && (
          <button className="link-btn" onClick={() => setEditing("new")}>
            + Add contact
          </button>
        )}
      </div>
      {editing === "new" && <ContactForm appId={appId} onDone={() => setEditing(null)} />}
      {contacts.length === 0 && editing !== "new" && <p className="muted small">No contacts yet. Add the recruiter or hiring manager.</p>}
      <ul className="contacts">
        {contacts.map((c) =>
          editing === c.id ? (
            <li key={c.id}>
              <ContactForm appId={appId} contact={c} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={c.id} className="contact">
              <div className="contact-head">
                <strong>{c.name}</strong>
                {c.title && <span className="muted"> · {c.title}</span>}
                <span className="tl-actions">
                  <button className="link-btn" onClick={() => setEditing(c.id)}>
                    Edit
                  </button>
                  <button className="link-btn danger" onClick={() => confirm(`Remove ${c.name}?`) && remove.mutate(c.id)}>
                    Delete
                  </button>
                </span>
              </div>
              <ContactLinks contact={c} />
              {c.notes && <p className="contact-notes">{c.notes}</p>}
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

export function ContactLinks({ contact: c }: { contact: Contact }) {
  const linkedin = c.linkedin && (/^https?:\/\//.test(c.linkedin) ? c.linkedin : `https://${c.linkedin}`);
  return (
    <div className="contact-links">
      {c.email && (
        <a href={`mailto:${c.email}`}>
          <Mail /> {c.email}
        </a>
      )}
      {c.phone && (
        <a href={`tel:${c.phone}`}>
          <Phone /> {c.phone}
        </a>
      )}
      {linkedin && (
        <a href={linkedin} target="_blank" rel="noreferrer">
          <ExternalLink /> LinkedIn
        </a>
      )}
    </div>
  );
}

function ContactForm({ appId, contact, onDone }: { appId: number; contact?: Contact; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState(() => (contact ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, contact[k as keyof ContactInput] ?? ""])) : EMPTY) as typeof EMPTY);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: () => (contact ? api.patchContact(contact.id, f) : api.addContact(appId, f)),
    onSuccess: () => {
      qc.invalidateQueries();
      onDone();
    },
    onError: (e) => toast(e.message, "error"),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (f.name.trim()) save.mutate();
  };

  return (
    <form className="contact-form" onSubmit={submit}>
      <div className="grid-2">
        <input placeholder="Name *" value={f.name} onChange={set("name")} autoFocus aria-label="Name" />
        <input placeholder="Title (e.g. Recruiter)" value={f.title} onChange={set("title")} aria-label="Title" />
        <input placeholder="Email" type="email" value={f.email} onChange={set("email")} aria-label="Email" />
        <input placeholder="Phone" value={f.phone} onChange={set("phone")} aria-label="Phone" />
        <input className="field-wide" placeholder="LinkedIn URL" value={f.linkedin} onChange={set("linkedin")} aria-label="LinkedIn" />
        <textarea className="field-wide" rows={2} placeholder="Notes" value={f.notes} onChange={set("notes")} aria-label="Notes" />
      </div>
      <div className="add-update-row">
        <button type="button" className="btn btn-quiet btn-sm" onClick={onDone}>
          Cancel
        </button>
        <button className="btn btn-primary btn-sm" disabled={!f.name.trim() || save.isPending}>
          {contact ? "Save" : "Add contact"}
        </button>
      </div>
    </form>
  );
}
