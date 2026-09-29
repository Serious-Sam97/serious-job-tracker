import { Router } from "express";
import { z } from "zod";
import type { Status } from "@prisma/client";
import { prisma } from "../db.js";
import { CLOSED_STATUSES } from "../schemas.js";

export const today = Router();
export const settings = Router();

const ACTIVE: Status[] = ["APPLIED", "SCREENING", "INTERVIEWING", "OFFER"];
export const STALE_DAYS = 21;

const DEFAULTS = { weeklyGoal: 10 };
const settingsSchema = z.object({ weeklyGoal: z.coerce.number().int().min(0).max(200) });
type Settings = z.infer<typeof settingsSchema>;

async function readSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany();
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULTS, ...settingsSchema.partial().parse(stored) };
}

settings.get("/", async (_req, res) => {
  res.json(await readSettings());
});

settings.patch("/", async (req, res) => {
  const data = settingsSchema.partial().parse(req.body);
  await prisma.$transaction(
    Object.entries(data).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } }),
    ),
  );
  res.json(await readSettings());
});

// The client sends its local calendar dates so "today" and "this week" match the user's timezone.
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const query = z.object({ today: dateStr, weekStart: dateStr });

today.get("/", async (req, res) => {
  const q = query.parse(req.query);
  const todayUtc = new Date(`${q.today}T00:00:00Z`);
  const staleBefore = new Date(Date.now() - STALE_DAYS * 86_400_000);
  const open = { notIn: [...CLOSED_STATUSES] };

  const [followUps, interviews, stale, appliedThisWeek, active, settings] = await Promise.all([
    prisma.application.findMany({
      where: { followUpAt: { not: null }, status: open },
      orderBy: { followUpAt: "asc" },
      select: { id: true, company: true, role: true, status: true, followUpAt: true, updatedAt: true },
    }),
    prisma.update.findMany({
      where: { type: "INTERVIEW", date: { gte: todayUtc }, application: { status: open } },
      orderBy: { date: "asc" },
      take: 10,
      include: { application: { select: { id: true, company: true, role: true, status: true } } },
    }),
    prisma.application.findMany({
      where: { status: { in: ACTIVE }, followUpAt: null, updatedAt: { lt: staleBefore } },
      orderBy: { updatedAt: "asc" },
      select: { id: true, company: true, role: true, status: true, updatedAt: true, appliedAt: true },
    }),
    prisma.application.count({
      where: { status: { not: "WISHLIST" }, appliedAt: { gte: new Date(`${q.weekStart}T00:00:00Z`) } },
    }),
    prisma.application.count({ where: { status: { in: ACTIVE } } }),
    readSettings(),
  ]);

  res.json({ followUps, interviews, stale, staleDays: STALE_DAYS, appliedThisWeek, active, weeklyGoal: settings.weeklyGoal });
});
