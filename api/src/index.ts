import express from "express";
import { prisma } from "./db.js";
import { auth, requireAuth } from "./auth.js";
import { errorHandler, HttpError } from "./http.js";
import { applications } from "./routes/applications.js";
import { contacts, updates } from "./routes/items.js";
import { stats } from "./routes/stats.js";
import { settings, today } from "./routes/today.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true });
});

app.use("/api/auth", auth);
app.use("/api", requireAuth);
app.use("/api/applications", applications);
app.use("/api/updates", updates);
app.use("/api/contacts", contacts);
app.use("/api/stats", stats);
app.use("/api/today", today);
app.use("/api/settings", settings);

app.use("/api", (_req, _res, next) => next(new HttpError(404, "Route not found")));
app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
const server = app.listen(port, () => console.log(`api listening on :${port}`));

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    server.close();
    prisma.$disconnect().finally(() => process.exit(0));
  });
}
