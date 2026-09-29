import { Router } from "express";
import type { Status } from "@prisma/client";
import { prisma } from "../db.js";
import { CLOSED_STATUSES, STATUSES } from "../schemas.js";

export const stats = Router();

const RESPONDED: Status[] = ["SCREENING", "INTERVIEWING", "OFFER", "ACCEPTED", "REJECTED"];
const INTERVIEWED: Status[] = ["INTERVIEWING", "OFFER", "ACCEPTED"];
const WEEKS = 12;

// Monday 00:00 UTC of the week containing d.
function weekStart(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x;
}

stats.get("/", async (_req, res) => {
  const firstWeek = weekStart(new Date());
  firstWeek.setUTCDate(firstWeek.getUTCDate() - 7 * (WEEKS - 1));

  const [grouped, applied, responded, interviewed, appliedDates, followUps, recent] = await Promise.all([
    prisma.application.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.application.count({ where: { status: { not: "WISHLIST" } } }),
    // Count every application that ever reached a stage, not just its current status.
    prisma.application.count({ where: { updates: { some: { toStatus: { in: RESPONDED } } } } }),
    prisma.application.count({ where: { updates: { some: { toStatus: { in: INTERVIEWED } } } } }),
    prisma.application.findMany({
      where: { appliedAt: { gte: firstWeek }, status: { not: "WISHLIST" } },
      select: { appliedAt: true },
    }),
    prisma.application.findMany({
      where: { followUpAt: { not: null }, status: { notIn: [...CLOSED_STATUSES] } },
      orderBy: { followUpAt: "asc" },
      select: { id: true, company: true, role: true, status: true, followUpAt: true },
    }),
    prisma.update.findMany({
      where: { date: { lte: new Date() } },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 8,
      include: { application: { select: { id: true, company: true, role: true } } },
    }),
  ]);

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const g of grouped) byStatus[g.status] = g._count._all;
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const active = total - byStatus.WISHLIST - CLOSED_STATUSES.reduce((a, s) => a + byStatus[s], 0);

  const weekly = Array.from({ length: WEEKS }, (_, i) => {
    const d = new Date(firstWeek);
    d.setUTCDate(d.getUTCDate() + 7 * i);
    return { week: d.toISOString().slice(0, 10), count: 0 };
  });
  for (const { appliedAt } of appliedDates) {
    const idx = Math.floor((weekStart(appliedAt!).getTime() - firstWeek.getTime()) / (7 * 86_400_000));
    if (weekly[idx]) weekly[idx].count++;
  }

  res.json({
    total,
    active,
    applied,
    byStatus,
    responseRate: applied ? responded / applied : 0,
    interviewRate: applied ? interviewed / applied : 0,
    offers: byStatus.OFFER + byStatus.ACCEPTED,
    weekly,
    followUps,
    recent,
  });
});
