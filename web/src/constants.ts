import type { Priority, Status, UpdateType, WorkMode } from "./api";

export const STATUSES: Status[] = [
  "WISHLIST",
  "APPLIED",
  "SCREENING",
  "INTERVIEWING",
  "OFFER",
  "ACCEPTED",
  "REJECTED",
  "GHOSTED",
  "WITHDRAWN",
];
export const PIPELINE: Status[] = ["WISHLIST", "APPLIED", "SCREENING", "INTERVIEWING", "OFFER", "ACCEPTED"];
export const CLOSED: Status[] = ["REJECTED", "GHOSTED", "WITHDRAWN"];

export const STATUS_LABEL: Record<Status, string> = {
  WISHLIST: "Wishlist",
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  GHOSTED: "Ghosted",
  WITHDRAWN: "Withdrawn",
};

export const WORK_MODE_LABEL: Record<WorkMode, string> = { REMOTE: "Remote", HYBRID: "Hybrid", ONSITE: "On-site" };
export const PRIORITY_LABEL: Record<Priority, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

export const UPDATE_TYPE_LABEL: Record<UpdateType, string> = {
  NOTE: "Note",
  STATUS_CHANGE: "Status change",
  INTERVIEW: "Interview",
  EMAIL: "Email",
  CALL: "Call",
  FOLLOW_UP: "Follow-up",
  OTHER: "Other",
};

export const SOURCES = ["LinkedIn", "Company website", "Referral", "Indeed", "Glassdoor", "Recruiter", "Job board", "Other"];
