import { createHmac, timingSafeEqual } from "node:crypto";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { HttpError } from "./http.js";

// Single-user password auth, off by default for local use.
// Session = "<expiresAt>.<hmac(expiresAt)>" in an httpOnly cookie.
const enabled = process.env.AUTH_ENABLED === "true";
const password = process.env.APP_PASSWORD ?? "";
const secret = process.env.SESSION_SECRET ?? "";
const secureCookie = process.env.COOKIE_SECURE === "true";
const COOKIE = "jt_session";
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;

// Single user, so a global limit on failed logins is enough to stop brute forcing.
const MAX_FAILURES = 10;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
let failures: number[] = [];

if (enabled && (password.length < 8 || secret.length < 32)) {
  throw new Error("AUTH_ENABLED=true requires APP_PASSWORD (8+ chars) and SESSION_SECRET (32+ chars)");
}

const sign = (payload: string) => createHmac("sha256", secret).update(payload).digest("base64url");

function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function readCookie(header: string | undefined): string | undefined {
  for (const part of header?.split(";") ?? []) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE) return decodeURIComponent(v.join("="));
  }
}

function isValid(token: string | undefined): boolean {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !safeEqual(sign(exp), sig)) return false;
  return Number(exp) > Date.now();
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!enabled || isValid(readCookie(req.headers.cookie))) return next();
  next(new HttpError(401, "Not authenticated"));
};

export const auth = Router();

auth.get("/me", (req, res) => {
  res.json({ authEnabled: enabled, authenticated: !enabled || isValid(readCookie(req.headers.cookie)) });
});

auth.post("/login", (req, res) => {
  if (!enabled) {
    res.json({ ok: true });
    return;
  }
  const now = Date.now();
  failures = failures.filter((t) => now - t < FAILURE_WINDOW_MS);
  if (failures.length >= MAX_FAILURES) throw new HttpError(429, "Too many failed attempts, try again in a few minutes");
  const body = z.object({ password: z.string() }).parse(req.body);
  if (!safeEqual(body.password, password)) {
    failures.push(now);
    throw new HttpError(401, "Wrong password");
  }
  const exp = String(Date.now() + MAX_AGE_MS);
  res.cookie(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    maxAge: MAX_AGE_MS,
    path: "/",
  });
  res.json({ ok: true });
});

auth.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE, { path: "/" });
  res.json({ ok: true });
});
