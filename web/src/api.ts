export type Status =
  | "WISHLIST"
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEWING"
  | "OFFER"
  | "ACCEPTED"
  | "REJECTED"
  | "GHOSTED"
  | "WITHDRAWN";
export type WorkMode = "REMOTE" | "HYBRID" | "ONSITE";
export type Priority = "LOW" | "MEDIUM" | "HIGH";
export type UpdateType = "NOTE" | "STATUS_CHANGE" | "INTERVIEW" | "EMAIL" | "CALL" | "FOLLOW_UP" | "OTHER";

export interface Application {
  id: number;
  company: string;
  role: string;
  url: string | null;
  location: string | null;
  workMode: WorkMode | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  source: string | null;
  status: Status;
  priority: Priority;
  appliedAt: string | null;
  followUpAt: string | null;
  description?: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { updates: number; contacts: number };
}

export interface Update {
  id: number;
  applicationId: number;
  type: UpdateType;
  content: string;
  date: string;
  fromStatus: Status | null;
  toStatus: Status | null;
}

export interface Contact {
  id: number;
  applicationId: number;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  notes: string | null;
  application?: Pick<Application, "id" | "company" | "role" | "status">;
}

export interface ApplicationDetail extends Application {
  updates: Update[];
  contacts: Contact[];
}

export interface Stats {
  total: number;
  active: number;
  applied: number;
  byStatus: Record<Status, number>;
  responseRate: number;
  interviewRate: number;
  offers: number;
  weekly: { week: string; count: number }[];
  followUps: Pick<Application, "id" | "company" | "role" | "status" | "followUpAt">[];
  recent: (Update & { application: Pick<Application, "id" | "company" | "role"> })[];
}

export interface Today {
  followUps: (Pick<Application, "id" | "company" | "role" | "status" | "followUpAt" | "updatedAt">)[];
  interviews: (Update & { application: Pick<Application, "id" | "company" | "role" | "status"> })[];
  stale: Pick<Application, "id" | "company" | "role" | "status" | "updatedAt" | "appliedAt">[];
  staleDays: number;
  appliedThisWeek: number;
  active: number;
  weeklyGoal: number;
}

export interface Settings {
  weeklyGoal: number;
}

export type ApplicationInput = Partial<Omit<Application, "id" | "createdAt" | "updatedAt" | "_count">>;
export type ContactInput = Partial<Omit<Contact, "id" | "applicationId" | "application">>;
export type UpdateInput = { type?: UpdateType; content: string; date?: string | null };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues: { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth")) window.dispatchEvent(new Event("auth:required"));
    const msg = data?.issues?.length
      ? data.issues.map((i: { message: string }) => i.message).join(", ")
      : (data?.error ?? `Request failed (${res.status})`);
    throw new ApiError(res.status, msg, data?.issues);
  }
  return data as T;
}

export interface ListParams {
  q?: string;
  status?: Status[];
  sort?: string;
}

export function listQuery(p: ListParams): string {
  const s = new URLSearchParams();
  if (p.q) s.set("q", p.q);
  if (p.status?.length) s.set("status", p.status.join(","));
  if (p.sort) s.set("sort", p.sort);
  const str = s.toString();
  return str ? `?${str}` : "";
}

export const api = {
  me: () => request<{ authEnabled: boolean; authenticated: boolean }>("GET", "/auth/me"),
  login: (password: string) => request<{ ok: true }>("POST", "/auth/login", { password }),
  logout: () => request<{ ok: true }>("POST", "/auth/logout"),

  stats: () => request<Stats>("GET", "/stats"),
  today: (today: string, weekStart: string) =>
    request<Today>("GET", `/today?${new URLSearchParams({ today, weekStart })}`),
  settings: () => request<Settings>("GET", "/settings"),
  saveSettings: (data: Partial<Settings>) => request<Settings>("PATCH", "/settings", data),
  list: (p: ListParams = {}) => request<Application[]>("GET", `/applications${listQuery(p)}`),
  get: (id: number) => request<ApplicationDetail>("GET", `/applications/${id}`),
  create: (data: ApplicationInput) => request<Application>("POST", "/applications", data),
  patch: (id: number, data: ApplicationInput) => request<Application>("PATCH", `/applications/${id}`, data),
  remove: (id: number) => request<void>("DELETE", `/applications/${id}`),

  addUpdate: (appId: number, data: UpdateInput) => request<Update>("POST", `/applications/${appId}/updates`, data),
  patchUpdate: (id: number, data: Partial<UpdateInput>) => request<Update>("PATCH", `/updates/${id}`, data),
  removeUpdate: (id: number) => request<void>("DELETE", `/updates/${id}`),

  contacts: () => request<Contact[]>("GET", "/contacts"),
  addContact: (appId: number, data: ContactInput) => request<Contact>("POST", `/applications/${appId}/contacts`, data),
  patchContact: (id: number, data: ContactInput) => request<Contact>("PATCH", `/contacts/${id}`, data),
  removeContact: (id: number) => request<void>("DELETE", `/contacts/${id}`),
};
