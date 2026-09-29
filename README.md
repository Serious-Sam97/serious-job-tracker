# Serious Job Tracker

Track the jobs you apply to: details of each vacancy, a timeline of updates, recruiter contacts, and follow-up reminders.

**Stack:** React 19 + Vite · Node 24 + Express 5 · PostgreSQL 17 via Prisma · Docker Compose

## Run it locally

```bash
docker compose up -d --build
```

- App: http://localhost:5173
- API: http://localhost:4000/api/health
- Postgres: `localhost:5433` (user/pass/db `seriousjobtracker`)

Code in `api/` and `web/` is mounted into the containers, so edits hot-reload. No `.env` is needed for local use.

```bash
docker compose logs -f api        # tail API logs
docker compose down               # stop (data is kept in the pgdata volume)
docker compose down -v            # stop AND delete all data
```

After changing `package.json` dependencies, rebuild and refresh the node_modules volumes:

```bash
docker compose up -d --build -V
```

## Features

- **Today** (home) — what needs you now: follow-ups due or overdue, interviews today, and applications that have gone quiet (no activity for 21+ days) with one-click actions. "Coming up" lists interviews and follow-ups for the next two weeks, and a weekly application goal tracks your pace.
- **Applications** — split view: list on the left (search, open/all/status filter, sort, CSV export), details on the right with a stage progress bar, status/priority/follow-up controls, timeline, notes, contacts and the job description.
  Keys: `j`/`k` move, `/` search, `n` new, `e` edit, `Esc` close.
- **⌘K / Ctrl+K** — command palette: jump to any application or page.
- **Timeline** — notes, interviews, emails, calls, follow-ups. Log an interview with a future date to schedule it; it shows up on Today. `⌘/Ctrl + Enter` to add.
- **Board** — Kanban; drag cards between columns to change status.
- **Insights** — response and interview rates, applications per week, pipeline by status, recent activity.
- **Contacts** — recruiters / hiring managers per application, plus a page listing all of them.

## Project layout

```
api/
  prisma/schema.prisma      data model (Application, Update, Contact)
  prisma/migrations/        SQL migrations, applied on container start
  src/index.ts              Express app
  src/auth.ts               optional single-password login
  src/routes/               applications, updates/contacts, stats, today + settings
web/
  src/pages/                Today, Workspace (split view), detail, form, Board, Insights, Contacts, Login
  src/components/           Board, Timeline, ContactsPanel, StageBar, CommandPalette, charts, ui
  src/styles.css            design tokens (warm editorial, light + dark) and all styles
  nginx.conf                prod: serves the build and proxies /api
docker-compose.yml          dev
docker-compose.prod.yml     prod
```

## Changing the data model

Edit `api/prisma/schema.prisma`, then create a migration against the dev database:

```bash
docker compose exec api npx prisma migrate dev --name describe_the_change
```

## API

All under `/api` (JSON). Requires the session cookie when login is enabled.

| Method | Path | |
|---|---|---|
| GET | `/applications?q=&status=A,B&sort=updated\|applied\|followUp\|company\|priority` | list |
| POST | `/applications` | create |
| GET/PATCH/DELETE | `/applications/:id` | detail includes `updates` + `contacts` |
| GET | `/applications/export.csv` | same filters as list |
| POST | `/applications/:id/updates` · `/applications/:id/contacts` | add |
| PATCH/DELETE | `/updates/:id` · `/contacts/:id` | edit / remove |
| GET | `/contacts` · `/stats` · `/today?today=YYYY-MM-DD&weekStart=YYYY-MM-DD` | |
| GET/PATCH | `/settings` | `{ weeklyGoal }` |
| GET/POST | `/auth/me` · `/auth/login` · `/auth/logout` | |

## Deploying (later)

`docker-compose.prod.yml` builds optimized images: nginx serves the React build and proxies `/api`, the API runs compiled JS, migrations run on start, and Postgres isn't exposed. Login is **on by default** in prod.

1. Copy the repo to the server and create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   # set POSTGRES_PASSWORD, APP_PASSWORD (8+ chars), SESSION_SECRET (openssl rand -hex 32)
   # AUTH_ENABLED=true, COOKIE_SECURE=true when served over HTTPS
   ```
2. Start it:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
3. It listens on `127.0.0.1:8080` (`PROD_PORT` / `WEB_BIND`). Point your reverse proxy or Cloudflare tunnel at `http://localhost:8080`.

Failed logins are limited to 10 per 15 minutes.

**Backups:**

```bash
docker compose -f docker-compose.prod.yml exec db pg_dump -U "$POSTGRES_USER" seriousjobtracker > backup-$(date +%F).sql
```
