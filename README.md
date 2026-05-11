# SR&ED Manager

A rebuild of the Precision SR&ED Manager prototype for a one-day coder challenge (May 11, 2026). Track SR&ED projects, employees, labour hours, and expenses.

## Stack

- **Frontend:** Next.js 16 (App Router) + Tailwind CSS v4, deployed on Vercel
- **Backend:** Express + `pg` (hand-written SQL, no ORM), deployed on Vercel as a serverless function
- **Database:** Postgres (Vercel Postgres in prod; local Postgres for dev)
- **Auth:** JWT in an httpOnly cookie
- **Monorepo:** Yarn 4 workspaces — `/app`, `/api`, `/shared`
- **AI:** Anthropic SDK — "Generate SR&ED narrative" button on each project drafts a paragraph from labour-entry notes (requires `ANTHROPIC_API_KEY`)

## Live demo

_(Vercel URL added after first deploy.)_

Login: `scott@etcweb.com` / `password`

## Run locally

Requires:

- Node 22+ (an `.nvmrc` is committed — `nvm use` will pick the right version)
- Yarn 4 (via Corepack — no global install needed)
- Docker Desktop running (or a local Postgres on `:5432`)

```bash
git clone <repo-url> sred-manager
cd sred-manager

# One-time: lets Node activate the Yarn 4.1.0 pinned in package.json.
corepack enable

# Bring up Postgres in Docker (Docker Desktop must be running).
docker compose up -d

cp .env.example .env       # defaults match the docker-compose Postgres

yarn install
yarn db:setup              # apply schema.sql + seed
yarn dev                   # starts /app on :3000 and /api on :4000
```

Open <http://localhost:3000> and log in. To stop and wipe the DB: `docker compose down -v`.

If `yarn install` fails on `bcrypt` (native build), install the platform toolchain and retry — on macOS that's `xcode-select --install`; on Debian/Ubuntu it's `sudo apt install build-essential python3`.

To try the **SR&ED narrative** feature, set `ANTHROPIC_API_KEY` in `.env` (uncomment the line in `.env.example`) and restart the API. Without the key, the rest of the app works normally; the narrative button just returns a 503.

## Project layout

```
/app        Next.js 16 frontend
/api        Express + pg API
/shared     Hand-written TypeScript types (and design-system.md)
```

Next.js rewrites `/api/*` to the Express service via `next.config.ts`, so the browser sees one origin and the JWT cookie just works.

## License

Internal coder challenge — no public license.
