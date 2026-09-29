import { Router } from "express";
import type { Prisma, Status } from "@prisma/client";
import { prisma } from "../db.js";
import { notFound } from "../http.js";
import { applicationCreate, applicationUpdate, contactCreate, idParam, status, updateCreate } from "../schemas.js";
import { toCsv } from "../csv.js";

export const applications = Router();

const SORTS: Record<string, Prisma.ApplicationOrderByWithRelationInput[]> = {
  updated: [{ updatedAt: "desc" }],
  applied: [{ appliedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  company: [{ company: "asc" }],
  followUp: [{ followUpAt: { sort: "asc", nulls: "last" } }],
  priority: [{ priority: "desc" }, { updatedAt: "desc" }],
};

function buildWhere(query: Record<string, unknown>): Prisma.ApplicationWhereInput {
  const where: Prisma.ApplicationWhereInput = {};
  if (typeof query.status === "string" && query.status) {
    where.status = { in: query.status.split(",").map((s) => status.parse(s)) };
  }
  const q = typeof query.q === "string" ? query.q.trim() : "";
  if (q) {
    where.OR = (["company", "role", "location", "source", "notes"] as const).map((field) => ({
      [field]: { contains: q, mode: "insensitive" },
    }));
  }
  return where;
}

applications.get("/", async (req, res) => {
  const sort = typeof req.query.sort === "string" && SORTS[req.query.sort] ? req.query.sort : "updated";
  const rows = await prisma.application.findMany({
    where: buildWhere(req.query),
    orderBy: SORTS[sort],
    omit: { description: true },
    include: { _count: { select: { updates: true, contacts: true } } },
  });
  res.json(rows);
});

applications.get("/export.csv", async (req, res) => {
  const rows = await prisma.application.findMany({
    where: buildWhere(req.query),
    orderBy: SORTS.applied,
  });
  const cols = [
    "id", "company", "role", "status", "priority", "location", "workMode", "salaryMin", "salaryMax",
    "currency", "source", "url", "appliedAt", "followUpAt", "notes", "createdAt", "updatedAt",
  ] as const;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="applications-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(toCsv(cols, rows));
});

applications.get("/:id", async (req, res) => {
  const app = await prisma.application.findUnique({
    where: { id: idParam.parse(req.params.id) },
    include: {
      updates: { orderBy: [{ date: "desc" }, { id: "desc" }] },
      contacts: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!app) throw notFound("Application");
  res.json(app);
});

applications.post("/", async (req, res) => {
  const data = applicationCreate.parse(req.body);
  const initial: Status = data.status ?? "APPLIED";
  if (!data.appliedAt && initial !== "WISHLIST") data.appliedAt = new Date();
  const app = await prisma.application.create({
    data: {
      ...data,
      status: initial,
      updates: {
        create: {
          type: "STATUS_CHANGE",
          content: initial === "WISHLIST" ? "Added to wishlist" : `Added with status ${initial}`,
          toStatus: initial,
        },
      },
    },
  });
  res.status(201).json(app);
});

applications.patch("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const data = applicationUpdate.parse(req.body);
  const existing = await prisma.application.findUnique({ where: { id } });
  if (!existing) throw notFound("Application");

  const statusChanged = data.status !== undefined && data.status !== existing.status;
  if (statusChanged && existing.status === "WISHLIST" && !existing.appliedAt && data.appliedAt === undefined) {
    data.appliedAt = new Date();
  }

  const app = await prisma.application.update({
    where: { id },
    data: {
      ...data,
      ...(statusChanged && {
        updates: {
          create: {
            type: "STATUS_CHANGE",
            content: `Status changed from ${existing.status} to ${data.status}`,
            fromStatus: existing.status,
            toStatus: data.status,
          },
        },
      }),
    },
  });
  res.json(app);
});

applications.delete("/:id", async (req, res) => {
  await prisma.application.delete({ where: { id: idParam.parse(req.params.id) } });
  res.status(204).end();
});

applications.post("/:id/updates", async (req, res) => {
  const applicationId = idParam.parse(req.params.id);
  const data = updateCreate.parse(req.body);
  const [, update] = await prisma.$transaction([
    // Adding an update counts as activity on the application (and 404s if it doesn't exist).
    prisma.application.update({ where: { id: applicationId }, data: { updatedAt: new Date() } }),
    prisma.update.create({
      data: { applicationId, type: data.type ?? "NOTE", content: data.content, date: data.date ?? undefined },
    }),
  ]);
  res.status(201).json(update);
});

applications.post("/:id/contacts", async (req, res) => {
  const applicationId = idParam.parse(req.params.id);
  const data = contactCreate.parse(req.body);
  await prisma.application.findUniqueOrThrow({ where: { id: applicationId }, select: { id: true } });
  const contact = await prisma.contact.create({ data: { ...data, applicationId } });
  res.status(201).json(contact);
});
