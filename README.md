# SR&ED Manager

A rebuild of the Precision SR&ED Manager prototype for a one-day coder challenge (May 11, 2026). Track SR&ED projects, employees, labour hours, and expenses.

## Features

### Core records
- **Projects CRUD** — SR&ED vs Internal, phase (concept/development/complete), start + due dates, project manager + parent project, deactivate/reactivate.
- **Employees CRUD** — name, role, access level, paid type, hours/year, rates, specified-employee flag, qualifications, status. Search by name/email/role.
- **Labour entries CRUD** — date, employee, project, hours, labour time (regular/overtime/double), labour type, objective evidence, notes. Server enforces hours ∈ (0, 24].
- **Expenses CRUD** — same shape as labour with cost + PO number + type instead of hours.

### Roles & permissions
- Three access levels — **Administrator**, **Standard**, **Limited**.
- **Limited users are blocked at login** with an explicit message ("Limited users cannot sign in. Please contact your administrator.") instead of a generic 401.
- **Standard users can only create / edit / delete labour and expense records for themselves.** Enforced both server-side and via a locked, read-only Employee picker on the UI.
- **Employee CRUD (add / edit / deactivate / reactivate) is admin-only.** Guarded by a small `requireAdmin` middleware and the UI hides the buttons for non-admins.

### Multi-day labour entry
- "Multiple days" toggle inside the Labour form swaps the Date field for a from/to range + a "Skip weekends" checkbox.
- Live preview ("Will create 5 entries") and a 92-day server-side cap.
- One atomic `INSERT ... SELECT FROM unnest($1::date[])` so the rows land or none do.

### Wage history & cost-aware reports
- New `wage_history` table — every rate change is an effective-dated row; `users.regular_rate / overtime_rate / holiday_rate` mirror the most recent past row.
- **"Add wage change"** dialog on the employee profile (admin-only): pick effective date + new rates + optional note. Edit Employee still works and also appends a history row so the audit trail stays consistent.
- Reports (monthly + yearly) compute **labour cost using the rate effective on each entry's date** via a `LATERAL` join into wage_history, routed by `labour_time`. New Labour / Expense / Total columns.

### Dashboard
- Narrative hero ("This week, *Company* logged 47 hours") with delta vs last week.
- Hand-rolled **SVG bar chart** of hours-by-day (no chart library), today's column highlighted.
- **Top this week** card with a Projects/Employees segmented toggle, backed by two SQL aggregates returned together.
- **Quick-action buttons** in the hero (+ Labour / + Expense / + Project) open the same modal forms used everywhere else.

### File attachments (labour + expenses)
- **Many files per entry** (max 10), PDF / JPG / PNG, **5 MB cap each**. Stored locally under `api/uploads/<company_id>/<uuid>.<ext>`; served via an authenticated streaming route.
- **Inline preview dialog** — images render through `<img>`, PDFs through `<iframe>` with the browser's native viewer (no PDF.js dependency). Download disposition switches via `?inline=1`.
- Server-side **magic-byte sniff** rejects renamed-extension spoofs (a `.png` whose first bytes aren't `89 50 4E 47` gets 400'd).
- Cross-tenant uploads/downloads return 404 by company-scope join; standard users can only manage attachments on their own records.

### Preferences
- **User preferences** — display name, language, timezone, change password. Every rendered date respects the user's tz from a single `lib/format.ts` (calendar dates anchored to UTC midnight to avoid the classic `new Date("2026-05-16")` → previous-day bug in western zones).
- **Company preferences** (admin-only) — company name, business number, address, contacts, fiscal year end, default timezone.

### Localization
- Four locales: **English, Spanish, French, Tagalog**. Hand-rolled catalog typed via `Messages = typeof messages.en` so missing keys fail at compile time.
- Login page uses `useSyncExternalStore(navigator.language)` because the i18n provider isn't mounted pre-auth.
- All Intl formatting (date, hours, currency, integer) flows through the user's `language` preference.

### Generic employee picker
- Reusable rich dropdown: avatar with deterministic-color initials, **name as primary text + email as subtext**, search bar when there are more than 6 options, optional "Unassigned" clear option, and a `locked` variant used for standard-user forms.

### Polish & UX
- **Modal-everywhere forms** — every quick-add (Labour, Expense, Project, Employee) opens an inline dialog using the native `<dialog>` element with explicit `inset-0 m-auto` centering (Tailwind v4 preflight resets the UA default).
- Date inputs **open the native picker on click anywhere** via `input.showPicker()`, including the date-range filter on the labour/expense lists (which also shows custom "From" / "To" placeholders).
- **Server validation messages bubble to the form** (e.g. ``hours must be a number > 0 and <= 24``) via a `getServerErrorMessage` helper; client-side validation mirrors the same constraints for instant feedback.
- **Sortable column headers** with URL-driven `?sortBy=&sortDir=` state — shareable and survives refresh.
- **Global search** in the topbar across projects + employees, served by `/search?q=`.

## Prompts

Prompting craft is 25% of the rubric. The full prompt history lives in two files at the repo root:

- **[`prompts-planning.md`](./prompts-planning.md)** — the initial planning conversation, curated by hand. Sets up the stack choices (no ORM, Yarn 4, JWT, modern aesthetic), the agent roster, and the demo-aware tradeoffs.
- **[`PROMPTS.md`](./PROMPTS.md)** — every prompt captured by a `UserPromptSubmit` hook during the build, timestamped, plus a *Curated highlights* section near the top that picks out the most load-bearing prompts (architectural pivots, design-direction nudges, the JSON-error-leak fix, the standard-user rule that prompted the role rollout, etc.).

If you only have time for one, read **PROMPTS.md** — the curated section is designed to be skimmed in a couple of minutes and tells the story of how the app got built.

## Stack

- **Frontend:** Next.js 16 (App Router) + Tailwind CSS v4
- **Backend:** Express + `pg` (hand-written SQL, no ORM)
- **Database:** Postgres 16
- **Auth:** JWT in an httpOnly cookie
- **Monorepo:** Yarn 4 workspaces — `/app`, `/api`, `/shared`

## Run locally

### Prerequisites

- **Node 22+** (an `.nvmrc` is committed — run `nvm use` to switch)
- **Docker Desktop running** (used to bring up Postgres; or supply your own Postgres on `:5432`)
- Yarn is installed automatically via Corepack — no global install needed

Works on macOS, Linux, and Windows (native PowerShell, Git Bash, or WSL2). No native build tools required — all dependencies are pure JS. On Windows native, swap the `cp` step below for `copy`.

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

## Troubleshooting

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
