import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, type ApplicationDetail, type ApplicationInput } from "../api";
import { PRIORITY_LABEL, SOURCES, STATUSES, STATUS_LABEL, WORK_MODE_LABEL } from "../constants";
import { addDays, toDateInput, todayStr } from "../format";
import { ErrorBox, Spinner } from "../components/ui";
import { useToast } from "../components/Toast";

type FormState = Record<
  | "company" | "role" | "url" | "location" | "workMode" | "salaryMin" | "salaryMax" | "currency"
  | "source" | "status" | "priority" | "appliedAt" | "followUpAt" | "description" | "notes",
  string
>;

function savedCurrency(): string {
  try {
    return localStorage.getItem("jt.currency") ?? "EUR";
  } catch {
    return "EUR";
  }
}

function initialState(app?: ApplicationDetail): FormState {
  return {
    company: app?.company ?? "",
    role: app?.role ?? "",
    url: app?.url ?? "",
    location: app?.location ?? "",
    workMode: app?.workMode ?? "",
    salaryMin: app?.salaryMin?.toString() ?? "",
    salaryMax: app?.salaryMax?.toString() ?? "",
    currency: app ? (app.currency ?? "") : savedCurrency(),
    source: app?.source ?? "",
    status: app?.status ?? "APPLIED",
    priority: app?.priority ?? "MEDIUM",
    appliedAt: app ? toDateInput(app.appliedAt) : todayStr(),
    followUpAt: app ? toDateInput(app.followUpAt) : addDays(todayStr(), 7),
    description: app?.description ?? "",
    notes: app?.notes ?? "",
  };
}

export default function ApplicationForm() {
  const { id } = useParams();
  const editing = id !== undefined;
  const app = useQuery({ queryKey: ["application", Number(id)], queryFn: () => api.get(Number(id)), enabled: editing });

  if (editing && app.isPending) return <Spinner />;
  if (editing && app.error) return <ErrorBox error={app.error} />;
  return <Form key={id ?? "new"} app={app.data} />;
}

function Form({ app }: { app?: ApplicationDetail }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState<FormState>(() => initialState(app));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: (data: ApplicationInput) => (app ? api.patch(app.id, data) : api.create(data)),
    onSuccess: (saved) => {
      qc.invalidateQueries();
      if (f.currency) {
        try {
          localStorage.setItem("jt.currency", f.currency);
        } catch {}
      }
      toast(app ? "Application saved" : "Application added");
      navigate(`/applications/${saved.id}`);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.issues.length) {
        setErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])));
      }
      toast(err.message, "error");
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!f.company.trim()) local.company = "Company is required";
    if (!f.role.trim()) local.role = "Role is required";
    if (f.salaryMin && f.salaryMax && Number(f.salaryMin) > Number(f.salaryMax)) local.salaryMax = "Max is below min";
    setErrors(local);
    if (Object.keys(local).length) return;
    // A wishlist job hasn't been applied to yet, so don't keep the default "today".
    const data = !app && f.status === "WISHLIST" ? { ...f, appliedAt: "" } : f;
    save.mutate(data as unknown as ApplicationInput);
  };

  const field = (k: keyof FormState, label: string, input: ReactNode, wide = false) => (
    <label className={`field${wide ? " field-wide" : ""}${errors[k] ? " has-error" : ""}`}>
      <span>{label}</span>
      {input}
      {errors[k] && <small className="field-error">{errors[k]}</small>}
    </label>
  );

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <Link to={app ? `/applications/${app.id}` : "/applications"} className="back">
            ← {app ? `${app.company}` : "Applications"}
          </Link>
          <h1>{app ? "Edit application" : "New application"}</h1>
        </div>
      </div>

      <form className="card form" onSubmit={submit} noValidate>
        <fieldset>
          <legend>The job</legend>
          <div className="grid-2">
            {field("company", "Company *", <input value={f.company} onChange={set("company")} autoFocus={!app} />)}
            {field("role", "Role / title *", <input value={f.role} onChange={set("role")} />)}
            {field("url", "Job posting URL", <input type="url" value={f.url} onChange={set("url")} placeholder="https://…" />, true)}
            {field("location", "Location", <input value={f.location} onChange={set("location")} placeholder="City, country" />)}
            {field(
              "workMode",
              "Work mode",
              <select value={f.workMode} onChange={set("workMode")}>
                <option value="">—</option>
                {Object.entries(WORK_MODE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>,
            )}
            <div className="field salary">
              <span>Salary range</span>
              <div className="salary-inputs">
                <input aria-label="Minimum salary" inputMode="numeric" value={f.salaryMin} onChange={set("salaryMin")} placeholder="Min" />
                <span className="muted">–</span>
                <input aria-label="Maximum salary" inputMode="numeric" value={f.salaryMax} onChange={set("salaryMax")} placeholder="Max" />
                <input aria-label="Currency" className="currency" value={f.currency} onChange={set("currency")} maxLength={10} />
              </div>
              {(errors.salaryMin || errors.salaryMax) && <small className="field-error">{errors.salaryMin || errors.salaryMax}</small>}
            </div>
            {field(
              "source",
              "Source",
              <>
                <input list="sources" value={f.source} onChange={set("source")} placeholder="Where did you find it?" />
                <datalist id="sources">
                  {SOURCES.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </>,
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend>Tracking</legend>
          <div className="grid-2">
            {field(
              "status",
              "Status",
              <select value={f.status} onChange={set("status")}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>,
            )}
            {field(
              "priority",
              "Priority",
              <select value={f.priority} onChange={set("priority")}>
                {Object.entries(PRIORITY_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>,
            )}
            {field("appliedAt", "Date applied", <input type="date" value={f.appliedAt} onChange={set("appliedAt")} />)}
            {field("followUpAt", "Follow up on", <input type="date" value={f.followUpAt} onChange={set("followUpAt")} />)}
          </div>
        </fieldset>

        <fieldset>
          <legend>Details</legend>
          {field("notes", "Notes", <textarea rows={3} value={f.notes} onChange={set("notes")} placeholder="Why this role, referral, anything to remember…" />, true)}
          {field(
            "description",
            "Job description",
            <textarea rows={8} value={f.description} onChange={set("description")} placeholder="Paste the job description so you still have it when the posting disappears" />,
            true,
          )}
        </fieldset>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : app ? "Save changes" : "Add application"}
          </button>
        </div>
      </form>
    </div>
  );
}
