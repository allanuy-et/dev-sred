# SR&ED Manager

A rebuild of the Precision SR&ED Manager prototype for a one-day coder challenge (May 11, 2026). Track SR&ED projects, employees, labour hours, and expenses.

## Stack

- **Frontend:** Next.js 16 (App Router) + Tailwind CSS v4
- **Backend:** Express + `pg` (hand-written SQL, no ORM)
- **Database:** Postgres 16
- **Auth:** JWT in an httpOnly cookie
- **Monorepo:** Yarn 4 workspaces — `/app`, `/api`, `/shared`
- **AI:** Anthropic SDK — "Generate SR&ED narrative" button on each project drafts a paragraph from labour-entry notes (optional; requires `ANTHROPIC_API_KEY`)

## Run locally

### Prerequisites

- **Node 22+** (an `.nvmrc` is committed — run `nvm use` to switch)
- **Docker Desktop running** (used to bring up Postgres; or supply your own Postgres on `:5432`)
- Yarn is installed automatically via Corepack — no global install needed

### One-time setup

```bash
git clone <repo-url> sred-manager
cd sred-manager

corepack enable              # activates the Yarn 4.1.0 pinned in package.json

docker compose up -d --wait  # starts Postgres on :5432 and waits for it to be healthy

cp .env.example .env         # defaults match the docker-compose Postgres

yarn install
yarn db:setup                # applies schema.sql + seeds demo data
```

### Day-to-day

```bash
yarn dev                     # starts /app on :3000 and /api on :4000
```

Then open <http://localhost:3000> and log in:

- **Email:** `scott@etcweb.com`
- **Password:** `password`

Other seeded accounts (`derek@`, `sarah@`, `joel@`, `corey@etcweb.com`) all use the same password.

### Useful commands

```bash
yarn typecheck               # type-check all workspaces
yarn build                   # build /app and /api
yarn db:setup                # re-apply schema and re-seed (wipes existing data)
docker compose down -v       # stop Postgres and wipe its volume
```

## Optional: AI narrative feature

To try the "Generate SR&ED narrative" button on the project detail page, set `ANTHROPIC_API_KEY` in `.env` (uncomment the line in `.env.example`) and restart `yarn dev`. Without the key, the rest of the app works normally — the button just returns a 503.

## Troubleshooting

- **`yarn install` fails on `bcrypt` (native build):** install the platform toolchain and retry. macOS: `xcode-select --install`. Debian/Ubuntu: `sudo apt install build-essential python3`.
- **Port 5432 / 3000 / 4000 already in use:** stop whatever's using them, or change `DATABASE_URL` / the workspace dev scripts.
- **`yarn db:setup` says `DATABASE_URL is not set`:** you forgot `cp .env.example .env`. The API and `db:setup` load env vars from the repo-root `.env` via Node's `--env-file-if-exists` flag.
- **Postgres connection refused:** `docker compose ps` to confirm the container is up and healthy; `docker compose logs postgres` for details.

## Project layout

```
/app        Next.js 16 frontend
/api        Express + pg API
/shared     Hand-written TypeScript types (and design-system.md)
```

Next.js rewrites `/api/*` to the Express service via `next.config.ts`, so the browser sees one origin and the JWT cookie just works.

## License

Internal coder challenge — no public license.
