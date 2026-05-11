# SR&ED Manager

A rebuild of the Precision SR&ED Manager prototype for a one-day coder challenge (May 11, 2026). Track SR&ED projects, employees, labour hours, and expenses.

## Stack

- **Frontend:** Next.js 16 (App Router) + Tailwind CSS v4, deployed on Vercel
- **Backend:** Express + `pg` (hand-written SQL, no ORM), deployed on Vercel as a serverless function
- **Database:** Postgres (Vercel Postgres in prod; local Postgres for dev)
- **Auth:** JWT in an httpOnly cookie
- **Monorepo:** Yarn 4 workspaces — `/app`, `/api`, `/shared`

## Live demo

_(Vercel URL added after first deploy.)_

Login: `scott@etcweb.com` / `password`

## Run locally

Requires Node 22+, Yarn 4, and a Postgres database (Docker or installed locally).

```bash
git clone <repo-url> sred-manager
cd sred-manager

# Easiest: bring up Postgres in Docker
docker compose up -d

cp .env.example .env       # defaults match the docker-compose Postgres

yarn install
yarn db:setup              # apply schema.sql + seed
yarn dev                   # starts /app on :3000 and /api on :4000
```

Open <http://localhost:3000> and log in. To stop and wipe the DB: `docker compose down -v`.

## Project layout

```
/app        Next.js 16 frontend
/api        Express + pg API
/shared     Hand-written TypeScript types (and design-system.md)
```

Next.js rewrites `/api/*` to the Express service via `next.config.ts`, so the browser sees one origin and the JWT cookie just works.

## License

Internal coder challenge — no public license.
