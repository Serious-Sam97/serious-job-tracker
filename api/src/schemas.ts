import { z } from "zod";

export const STATUSES = [
  "WISHLIST",
  "APPLIED",
  "SCREENING",
  "INTERVIEWING",
  "OFFER",
  "ACCEPTED",
  "REJECTED",
  "GHOSTED",
  "WITHDRAWN",
] as const;

export const CLOSED_STATUSES = ["ACCEPTED", "REJECTED", "GHOSTED", "WITHDRAWN"] as const;

export const status = z.enum(STATUSES);
const workMode = z.enum(["REMOTE", "HYBRID", "ONSITE"]);
const priority = z.enum(["LOW", "MEDIUM", "HIGH"]);
const updateType = z.enum(["NOTE", "STATUS_CHANGE", "INTERVIEW", "EMAIL", "CALL", "FOLLOW_UP", "OTHER"]);

// Forms send "" for blank fields; store those as null.
const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const optText = (max = 500) =>
  z.preprocess(blankToNull, z.string().trim().max(max).nullable().optional());
const optLongText = z.preprocess(blankToNull, z.string().max(100_000).nullable().optional());
const optDate = z.preprocess(blankToNull, z.coerce.date().nullable().optional());
const optInt = z.preprocess(blankToNull, z.coerce.number().int().min(0).nullable().optional());
const optEnum = <T extends z.ZodTypeAny>(e: T) => z.preprocess(blankToNull, e.nullable().optional());

export const applicationCreate = z.object({
  company: z.string().trim().min(1, "Company is required").max(200),
  role: z.string().trim().min(1, "Role is required").max(200),
  url: optText(2000),
  location: optText(200),
  workMode: optEnum(workMode),
  salaryMin: optInt,
  salaryMax: optInt,
  currency: optText(10),
  source: optText(100),
  status: status.optional(),
  priority: priority.optional(),
  appliedAt: optDate,
  followUpAt: optDate,
  description: optLongText,
  notes: optLongText,
});

export const applicationUpdate = applicationCreate.partial();

export const updateCreate = z.object({
  type: updateType.optional(),
  content: z.string().trim().min(1, "Content is required").max(20_000),
  date: optDate,
});
export const updatePatch = updateCreate.partial();

export const contactCreate = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  title: optText(200),
  email: optText(200),
  phone: optText(50),
  linkedin: optText(500),
  notes: optLongText,
});
export const contactPatch = contactCreate.partial();

export const idParam = z.coerce.number().int().positive();
