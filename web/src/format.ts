import type { Application } from "./api";

// Date-only values (applied, follow-up, manual updates) are stored as UTC midnight,
// so they're shown as UTC calendar dates and compared as YYYY-MM-DD strings.

export const todayStr = () => new Date().toLocaleDateString("en-CA");

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const toDateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

const isDateOnly = (iso: string) => iso.endsWith("T00:00:00.000Z");

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: iso.slice(0, 4) === String(new Date().getFullYear()) ? undefined : "numeric",
    timeZone: isDateOnly(iso) ? "UTC" : undefined,
  });
}

export function fmtDateTime(iso: string): string {
  if (isDateOnly(iso)) return fmtDate(iso);
  return `${fmtDate(iso)}, ${new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

export function relativeDay(iso: string): string {
  const diff = Math.round(
    (Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${todayStr()}T00:00:00Z`)) / 86_400_000,
  );
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`;
}

export type FollowUpState = "overdue" | "today" | "upcoming" | null;

export function followUpState(app: Pick<Application, "followUpAt" | "status">): FollowUpState {
  if (!app.followUpAt || ["ACCEPTED", "REJECTED", "GHOSTED", "WITHDRAWN"].includes(app.status)) return null;
  const d = app.followUpAt.slice(0, 10);
  const t = todayStr();
  return d < t ? "overdue" : d === t ? "today" : "upcoming";
}

export function fmtSalary(a: Pick<Application, "salaryMin" | "salaryMax" | "currency">): string | null {
  const n = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v));
  const cur = a.currency ? `${a.currency} ` : "";
  if (a.salaryMin && a.salaryMax) return `${cur}${n(a.salaryMin)} – ${n(a.salaryMax)}`;
  if (a.salaryMin) return `${cur}${n(a.salaryMin)}+`;
  if (a.salaryMax) return `up to ${cur}${n(a.salaryMax)}`;
  return null;
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;

// Monday of the current local week, as YYYY-MM-DD.
export function weekStartStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toLocaleDateString("en-CA");
}

export function sinceShort(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (mins < 60) return mins <= 1 ? "now" : `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  return months < 12 ? `${months}mo` : `${Math.round(months / 12)}y`;
}

export const daysSince = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);

export function dayLabel(iso: string): string {
  const rel = relativeDay(iso);
  if (rel === "today" || rel === "tomorrow") return rel[0].toUpperCase() + rel.slice(1);
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
