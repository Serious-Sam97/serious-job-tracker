import { Router } from "express";
import { prisma } from "../db.js";
import { contactPatch, idParam, updatePatch } from "../schemas.js";

// Edit/delete for timeline updates and contacts, addressed by their own id.
export const updates = Router();
export const contacts = Router();

updates.patch("/:id", async (req, res) => {
  const data = updatePatch.parse(req.body);
  const update = await prisma.update.update({
    where: { id: idParam.parse(req.params.id) },
    data: { ...data, date: data.date ?? undefined },
  });
  res.json(update);
});

updates.delete("/:id", async (req, res) => {
  await prisma.update.delete({ where: { id: idParam.parse(req.params.id) } });
  res.status(204).end();
});

contacts.get("/", async (_req, res) => {
  const rows = await prisma.contact.findMany({
    orderBy: { name: "asc" },
    include: { application: { select: { id: true, company: true, role: true, status: true } } },
  });
  res.json(rows);
});

contacts.patch("/:id", async (req, res) => {
  const contact = await prisma.contact.update({
    where: { id: idParam.parse(req.params.id) },
    data: contactPatch.parse(req.body),
  });
  res.json(contact);
});

contacts.delete("/:id", async (req, res) => {
  await prisma.contact.delete({ where: { id: idParam.parse(req.params.id) } });
  res.status(204).end();
});
