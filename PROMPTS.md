# Prompts

This file is the record of how Claude Code was directed during the SR&ED Manager build.
The raw log below is auto-appended by a UserPromptSubmit hook. The curated highlights
section is maintained by the `prompts-curator` agent and is what we'll discuss Wednesday.

> **Pre-hook planning session:** the initial architectural discussion happened before the
> hook was installed. Those prompts are curated by hand in [`prompts-planning.md`](./prompts-planning.md).

## Curated highlights

_Phases 1–3 — parallel agents, build-error triage, code review, cross-phase security catch._
_For the pre-hook planning arc, see [`prompts-planning.md`](./prompts-planning.md)._

---

### 1. `[worked]` Spawning two agents in one sentence with implicit contract enforcement

> *"Escape GitHub and Vercel for now. I want to do the phase one But spawn the backend agent for this. And spawn the front end agent for the portal work"*

**Technique:** A single casual sentence kicked off two parallel sub-agents and simultaneously deferred two whole concerns (GitHub, Vercel). The lightweight phrasing worked because the plan file already held the API contract — the agents had a shared spec to align on without the trigger message needing to repeat it.

---

### 2. `[worked]` Build error pasted verbatim, zero paraphrasing

> *"You're importing a module that depends on `next/headers`. This API is only available in Server Components [...] Import traces: Client Component Browser: ./app/src/lib/api.ts [...] ./app/src/app/login/page.tsx"*

**Technique:** The full Next.js build output — including the import trace — was pasted raw. The import chain (`login/page.tsx` → `api.ts` → `next/headers`) is what made the root cause unambiguous; the trace pointed directly at the structural split (`api.ts` / `api.server.ts` / `api.client.ts`) as the only correct fix.

---

### 3. `[planning]` Parallel agent spawn as a forcing function for tight contracts

> *(Phase 1 spawn — raw log task notifications at 12:27 and 12:29)*

**Technique:** Spawning backend and frontend agents in parallel meant each had to be given a complete, self-contained brief up front — you can't iterate with a parallel agent mid-task. The constraint forced the API contract into `@sred/shared` *before* either agent touched code, which is why the shared types existed before the frontend tried to consume them.

---

### 4. `[fought back]` Reviewer caught stale fallback that would have silently 400'd every form

> *(Code-reviewer finding — raw log task notification at 12:40)*
> *"The fallback ids `'seed-employee-scott'` and `'seed-project-rd'` are NOT valid UUIDs. The backend's `isUuid` regex [...] will reject any POST/PATCH that uses them with HTTP 400 [...] the `if (!res) return FALLBACK` branch [...] makes the form render but every submission silently 400s."*

**Technique:** The reviewer was scoped to the diff *and* the backend's own validation rules — so it could cross-reference the frontend's fallback ids against the UUID guard, a check no single-agent pass would have made. The "silently 400s" framing names the failure mode visible to the demo audience, not just the bug.

---

### 5. `[fought back]` Reviewer caught type re-declaration divergence against shared package

> *(Code-reviewer finding — raw log task notification at 12:40)*
> *"The dashboard re-declares `ActivityKind = 'labour' | 'expense' | 'project' | 'employee'` [which] diverges from the shared `RecentActivityKind = 'labour' | 'project'`. A judge asking 'where do your shared types live?' will see this immediately."*

**Technique:** The reviewer was primed to evaluate for judging criteria, not just correctness — so it framed the divergence as a demo-day liability ("A judge asking...") rather than a lint warning. Dual framing (bug + presentation risk) makes the fix obviously high-priority.

---

### 6. `[recovery]` Short "what is next" to re-anchor after Phase 0

> *"ok good to go now. what is next in our plan?"*

**Technique:** After a restart, a two-word check-in plus a plan-anchored question put the plan file back in the driver's seat instead of relying on conversation memory. Almost trivially short, but it routes everything through the written spec rather than re-summarizing context from scratch.

---

### 7. `[fought back]` Phase 3 agent surfaced a pre-existing cross-tenant leak — and refused to touch it

> *(Phase 3 backend agent — raw log task notification at 13:04)*
> *"`labour.ts` itself is not company-scoped today. I noticed this while pattern-matching but intentionally did NOT touch it (hard rule #9: don't break Phase 1/2 routes). Flagging in case you want a follow-up PR."*

**Technique:** The Phase 3 expenses agent was written with correct company-scoping from the start — and that contrast made the labour gap visible when the agent read both files side by side. A single-phase review would never have had this cross-reference. The agent's self-restraint ("I did NOT touch it") also prevented a silent scope creep that could have broken Phase 1 tests.

---

### 8. `[worked]` Phase 2 reviewer returned zero must-fixes — the tighter contract paid off

> *(Code-reviewer finding — raw log task notification at 12:55)*
> *"Must fix before commit: None. SQL is parameterized end-to-end [...] every `:id` endpoint enforces `company_id` scoping, `requireAuth` is mounted via `router.use(requireAuth)` on both new routers."*

**Technique:** Phase 1 had four must-fix items. Phase 2 had zero. The difference: the Phase 2 spawn included explicit contract details (scoping behavior, 404-not-403, 409 on email collision) that the Phase 1 spawn left implicit. Spelling out invariants in the brief rather than in post-review feedback is demonstrably faster.

---

### 9. `[fought back]` Reviewer caught silent data-loss on inactive manager in project edit

> *(Phase 2 code-reviewer finding — raw log task notification at 12:55)*
> *"if a project's currently-assigned manager [...] has been deactivated, the dropdown won't include them, so the form silently drops a valid existing assignment on save (the `value=""` falls through to `— Unassigned —` and the PATCH body sends `projectManagerId: null`)."*

**Technique:** The reviewer was given both the frontend form logic and the backend's `?status=active` default in scope simultaneously — the bug only exists at their intersection. Neither file alone would have revealed it. This is the same cross-file pattern that caught the Phase 1 UUID bug, now applied to a subtler data-loss scenario.

---

### 10. `[worked]` Server/client boundary enforced by module placement, not linting

> *(Phase 2 frontend agent — raw log task notification at 12:49)*
> *"`parseStatusFilter` lives in `app/src/lib/status-filter.ts` as a pure module (no `'use client'`, no React), so Server Components can import it without dragging in client runtime. `StatusFilter.tsx` re-exports the type for client-side ergonomics — fine."*

**Technique:** Instead of hoping a linter catches the boundary violation, the agent separated the pure parsing logic from the React component at the file level. The placement *is* the enforcement — no annotation or rule needed. The Phase 2 reviewer called this out as a "defensible" pattern, confirming the approach in one pass.

## Raw log

_(auto-appended by `.claude/hooks/save-prompt.sh`)_

### 2026-05-11T12:21:22Z
ok good to go now. what is next in our plan?

### 2026-05-11T12:23:04Z
Escape GitHub and Vercel for now. I want to do the phase one But spawn the backend agent for this. And spawn the front end agent for the portal work

### 2026-05-11T12:27:33Z
<task-notification>
<task-id>a0d9f39eddbbf57dc</task-id>
<tool-use-id>toolu_01JH33o9HGKzZUbaf7sqeTfD</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-paolouy-dev-sred-manager/da4a2ff4-02a7-4ea2-94e6-d8ef8d9de34c/tasks/a0d9f39eddbbf57dc.output</output-file>
<status>completed</status>
<summary>Agent "Build Phase 1 backend slice" completed</summary>
<result>Phase 1 backend is done. Typecheck passes.

## Files created / modified

Created:
- `/Users/paolouy/dev/sred-manager/api/src/routes/auth.ts`
- `/Users/paolouy/dev/sred-manager/api/src/routes/labour.ts`
- `/Users/paolouy/dev/sred-manager/api/src/routes/dashboard.ts`
- `/Users/paolouy/dev/sred-manager/shared/src/types/dashboard.ts`

Modified:
- `/Users/paolouy/dev/sred-manager/api/src/index.ts` — mounted routers, added a central error handler
- `/Users/paolouy/dev/sred-manager/shared/src/types/labour.ts` — added `CreateLabourInput`, `UpdateLabourInput`, `LabourListResponse`, `LabourEntryResponse`, `LabourEntryWithRelationsResponse`
- `/Users/paolouy/dev/sred-manager/shared/src/index.ts` — export `./types/dashboard.js`

## Contract notes

All endpoints match the spec. Notes worth flagging:

- `POST /labour` returns **201** (per the contract); other writes return 200.
- `POST /auth/login` runs a `bcrypt.compare` even when the email doesn't exist, against a fixed dummy hash. Mitigates the trivial timing channel that leaks whether an email is registered.
- `GET /auth/me` re-fetches the user from the DB (per spec). If the user has been deleted out from under the JWT, it clears the cookie and returns 401.
- `404` is also returned (rather than `400`) when path params fail UUID format — a malformed id is functionally indistinguishable from "not found" for the caller.

## New shared types

In `@sred/shared`:
- `CreateLabourInput`, `UpdateLabourInput`, `LabourListResponse`, `LabourEntryResponse`, `LabourEntryWithRelationsResponse` (labour.ts)
- `DashboardStats`, `RecentActivityKind`, `RecentActivityItem`, `RecentActivityResponse` (new dashboard.ts)

## Judgment calls

1. **"This week" boundaries** are computed in Postgres via `date_trunc('week', now() AT TIME ZONE 'America/Toronto')`. Postgres weeks start Monday, so this gives `[Monday, Monday + 6 days]` in Toronto local. The spec said "use America/Toronto for now — pull from the user's timezone later"; I left a comment marking the swap point.

2. **`projectsCount` / `projectsInSred` are company-scoped**, not user-scoped, even though `hoursThisWeek` is user-scoped. The spec only said the hours stat is "scoped to the logged-in user's hours, not company-wide" — by contrast, project counts make sense at company level (a user wouldn't "own" projects in a way that filtered them differently from their company). If you want it user-scoped (e.g., only projects the user is PM of, or only projects they've logged hours on), flag it and I'll change.

3. **Recent-activity is company-scoped** (all labour entries by anyone in the user's company, plus all projects in the company). The spec's example label ("Scott Holmes recorded 8.00 hours for IPTV...") implies you want to see other people's activity, which only makes sense if it's not user-scoped.

4. **Labour writes do not enforce that the entry belongs to the caller** — any authenticated user can create/edit/delete any labour entry. The spec didn't specify authorization rules; this matches the open-by-default tone of the rest of Phase 1. Easy to add an `employee_id = req.user.userId` check later (or an admin bypass) if you want.

5. **`bcrypt.compare` against a fixed dummy hash** when the user isn't found — mentioned above. It's a few extra ms on the not-found path but pays back in not advertising the email enumeration channel.

6. **Numeric coercion** — pg returns `NUMERIC` columns as strings. The mapper `toLabourEntry` does `Number(row.hours)` so JSON responses get a real number. Same for `hoursThisWeek` and the activity hours formatting.

7. **`PATCH /labour/:id`** with body keys not in the allowed list will silently ignore them (only validated keys land in the SET clause). An empty patch returns 400. I considered failing on unknown keys but went with the lenient approach since the frontend can over-send safely.</result>
<usage><total_tokens>57913</total_tokens><tool_uses>34</tool_uses><duration_ms>199496</duration_ms></usage>
</task-notification>

### 2026-05-11T12:29:34Z
<task-notification>
<task-id>ac13da439b7d0dbc4</task-id>
<tool-use-id>toolu_01MJdNrGjNadaLrpVNGZNWkh</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-paolouy-dev-sred-manager/da4a2ff4-02a7-4ea2-94e6-d8ef8d9de34c/tasks/ac13da439b7d0dbc4.output</output-file>
<status>completed</status>
<summary>Agent "Build Phase 1 frontend slice" completed</summary>
<result>Done. Both `yarn workspace @sred/app run typecheck` and `lint` pass.

## Files created

**UI primitives** — `/Users/paolouy/dev/sred-manager/app/src/components/`
- `Button.tsx` — `primary | secondary | destructive` × `default | sm`, ref-forwarded
- `Card.tsx` — `title` + `actions` props; optional `compact` for `p-4` vs `p-6`
- `Field.tsx` — exports `Field`, `TextAreaField`, `SelectField`; built on a shared `FieldShell` for label + helper/error text; refs forwarded
- `Table.tsx` — `Table`, `THead`, `TBody`, `TR`, `TH`, `TD` primitives + `EmptyTableState`
- `Badge.tsx` — `active | concept | neutral`
- `AppShell.tsx` — server wrapper (top nav + user + logout) wrapping `mx-auto max-w-[1120px] px-6 py-8`
- `NavLinks.tsx` — client component for the active-nav indicator (uses `usePathname`)
- `LogoutButton.tsx` — client; calls `logout()` then `router.push('/login')`

**Lib** — `/Users/paolouy/dev/sred-manager/app/src/lib/`
- `api.ts` — `serverApi` + `clientApi` + `ApiError`. `serverApi` reads cookies via `await cookies()` and hits `process.env.API_URL` directly (Server Component fetches don't go through Next's rewrite). `clientApi` goes through `/api/...` with `credentials: 'include'`.
- `auth.ts` — `getCurrentUser()` (server) and `logout()` (client) + `SessionUser` type
- `labour-labels.ts` — enum → human-readable label maps for the labour types
- `format.ts` — `formatDate`, `formatRelativeTime`, `formatHours`

**Routes** — `/Users/paolouy/dev/sred-manager/app/src/app/`
- `login/page.tsx` — replaced placeholder with real form, pre-filled with `scott@etcweb.com` / `password`
- `(app)/layout.tsx` — auth gate via `getCurrentUser()` → `redirect('/login')` → `&lt;AppShell&gt;`
- `(app)/dashboard/page.tsx` — welcome row, stat strip (`text-3xl font-semibold tabular-nums`), Recent Activity card (with empty state), placeholder "Hours by project" card
- `(app)/labour/page.tsx` — list view (server fetch `/labour?limit=50`)
- `(app)/labour/new/page.tsx` — server page that loads employees/projects, renders the form
- `(app)/labour/[id]/page.tsx` — server page that fetches the entry (404 → `notFound()`), passes to client detail view
- `(app)/labour/_components/LabourForm.tsx` — shared client form for create + edit
- `(app)/labour/[id]/_components/LabourDetail.tsx` — client view↔edit toggle + delete (with `window.confirm`)
- `(app)/labour/_lib/selectOptions.ts` — `loadEmployees()` / `loadProjects()` that try `/api/employees` and `/api/projects` and fall back to a single seeded entry each with a TODO

## Backend contract assumptions (worth flagging)

1. `GET /auth/me` returns `401` (not 200 with null) when unauthenticated. `getCurrentUser()` treats `401` and any other `ApiError` as "logged out."
2. `loadEmployees()` expects `GET /employees` → `{ employees: User[] }`, `loadProjects()` expects `GET /projects` → `{ projects: Project[] }`. If the backend agent picks different shapes for Phase 2, only `_lib/selectOptions.ts` needs to change. The fallback uses `seed-employee-scott` and `seed-project-rd` as placeholder ids — the demo won't actually persist labour entries until these are real ids.
3. Recent activity items are typed as `{ kind: 'labour' | 'expense' | 'project' | 'employee', id, label, ts }`. Unknown kinds fall back to a `•` icon.
4. `LabourEntryWithRelations.date` is sliced to 10 chars before being put into a `&lt;input type="date"&gt;` — assumes ISO format from the backend.

## Design-system judgment calls (please codify)

1. **Select chevron** — design system covers `&lt;input&gt;` but is silent on `&lt;select&gt;`. I used a token-colored inline SVG chevron via `background-image` and `appearance-none` so it matches the input border style. (`Field.tsx` line ~170.)
2. **Active table row treatment** — design system says "no alternating row colors" but doesn't explicitly cover row click affordance. I used `hover:bg-surface-hover` on rows marked `interactive` and rendered a real `&lt;Link&gt;` in a dedicated Actions column rather than making the whole row clickable. Worth a call from the design-system agent if whole-row links are preferred.
3. **Stat card** — the design system specifies the number typography (`text-3xl font-semibold tabular-nums`) but not the full card. I used `Card`-equivalent shell (`rounded-lg border border-border bg-surface p-6 shadow-sm`) with the label in `text-xs uppercase tracking-wide text-text-muted`. Matches Linear/Vercel patterns.
4. **Description list on detail page** — the design system doesn't cover key-value display. I used a 2-column `&lt;dl&gt;` with `text-xs uppercase tracking-wide text-text-muted` labels and `text-sm text-text` values to stay consistent with the table-column-header treatment.
5. **Form layout** — used a 2-column `grid` on `sm:` and above for the labour form. Notes textarea spans full width below. Design system has spacing patterns (`space-y-4` for form fields) but not multi-column layout — this felt right for desktop and collapses cleanly on mobile.
6. **Inline error banner** — I used `border border-red-200 bg-red-50 px-3 py-2 text-xs text-danger rounded-md`. The design system specifies error _text_ color but not a full alert pattern; this composes existing tokens with the Tailwind `red-50`/`red-200` already used by the Active badge family.</result>
<usage><total_tokens>73069</total_tokens><tool_uses>55</tool_uses><duration_ms>287638</duration_ms></usage>
</task-notification>

### 2026-05-11T12:36:26Z
## Error Type
Build Error

## Error Message
You're importing a module that depends on "next/headers". This API is only available in Server Components in the App Router, but you are using it in the Pages Router.

## Build Output
./app/src/lib/api.ts:1:1
You're importing a module that depends on "next/headers". This API is only available in Server Components in the App Router, but you are using it in the Pages Router.
    Learn more: https://nextjs.org/docs/app/building-your-application/rendering/server-components
> 1 | import { cookies } from 'next/headers'
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  2 |
  3 | /**
  4 |  * Backend API base URL.

Ecmascript file had an error

Import traces:
  Client Component Browser:
    ./app/src/lib/api.ts [Client Component Browser]
    ./app/src/app/login/page.tsx [Client Component Browser]
    ./app/src/app/login/page.tsx [Server Component]

  Client Component SSR:
    ./app/src/lib/api.ts [Client Component SSR]
    ./app/src/app/login/page.tsx [Client Component SSR]
    ./app/src/app/login/page.tsx [Server Component]

Next.js version: 16.2.6 (Turbopack)

### 2026-05-11T12:40:21Z
<task-notification>
<task-id>a8de03e963a424274</task-id>
<tool-use-id>toolu_01Dg1sYvR3J9cLMGfUAPiKyX</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-paolouy-dev-sred-manager/da4a2ff4-02a7-4ea2-94e6-d8ef8d9de34c/tasks/a8de03e963a424274.output</output-file>
<status>completed</status>
<summary>Agent "Review Phase 1 diff" completed</summary>
<result>The design system explicitly uses `bg-red-700` for destructive hover and `text-warning`/`text-success` + `bg-amber-50`/`bg-green-50` patterns are allowed (the system shows raw Tailwind colors for the badge color families with token-text). So `Badge.tsx` and `Button.tsx` are consistent with the design system's prescribed patterns.

Now I have enough. Let me consolidate findings.

Reviewed the Phase 1 diff (tracked changes vs HEAD plus the untracked new files: 5 API routers, 8 frontend components, 4 lib files, the `(app)` route group, and the new shared dashboard type).

## Must fix before commit

- `app/src/app/(app)/labour/_lib/selectOptions.ts:13-18` — The fallback ids `'seed-employee-scott'` and `'seed-project-rd'` are NOT valid UUIDs. The backend's `isUuid` regex in `api/src/routes/labour.ts:18` will reject any POST/PATCH that uses them with HTTP 400 ("Invalid `employeeId`"). And critically, `/employees` and `/projects` DO exist on the backend now (`api/src/routes/employees.ts`, `projects.ts`) — the `TODO(phase-2)` comment claiming they don't is stale and Wednesday-embarrassing. Fix: delete `EMPLOYEE_FALLBACK` / `PROJECT_FALLBACK` and the `safeFetch` indirection; if the load fails, let the page surface the error. The `if (!res) return FALLBACK` branch is the worst case — it makes the form render but every submission silently 400s.

- `app/src/app/(app)/dashboard/page.tsx:6-23` — The dashboard re-declares `DashboardStats`, `ActivityKind`, `ActivityItem`, `RecentActivityResponse` locally. `shared/src/types/dashboard.ts` already exports `DashboardStats`, `RecentActivityKind`, `RecentActivityItem`, `RecentActivityResponse`. Worse, the local `ActivityKind = 'labour' | 'expense' | 'project' | 'employee'` diverges from the shared `RecentActivityKind = 'labour' | 'project'`. A judge asking "where do your shared types live?" will see this immediately. Fix: delete the local interfaces and `import type { DashboardStats, RecentActivityItem, RecentActivityResponse, RecentActivityKind } from '@sred/shared'`. The `ACTIVITY_ICONS` map can stay but should be keyed off the real `RecentActivityKind`.

- `app/src/app/(app)/labour/page.tsx:20-23` — Re-declares `ListResponse` locally; `LabourListResponse` was added to `@sred/shared` in this very diff (shared/src/types/labour.ts:50-53). Fix: `import type { LabourListResponse } from '@sred/shared'` and drop the local interface.

- `app/src/app/(app)/labour/[id]/page.tsx:12-14` — Same pattern; `LabourEntryWithRelationsResponse` was added to `@sred/shared` (labour.ts:59-61) and is unused. Fix: import it and drop the local `EntryResponse`.

## Should fix

- `app/src/app/(app)/labour/_lib/selectOptions.ts:20-27` — `safeFetch` swallows ALL `ApiError`s (including 500 and 401) and falls back to the bogus seed values. Once the fallbacks are removed (Must-fix above), this whole helper should just inline `serverApi` and let auth/network errors propagate to the page boundary like every other route does.

- `app/src/lib/api.ts` and `app/src/lib/auth.ts` (whole files) — These exist alongside `api.client.ts`/`api.server.ts` and `auth.client.ts`/`auth.server.ts`. The split was the agent's fix for the `next/headers` build error noted in `PROMPTS.md`. `api.ts` and `auth.ts` are now just type/error re-export stubs. That's fine, but make sure (a) `api.ts` does NOT re-export anything from `api.server.ts` (verified — it doesn't) and (b) the README/architecture note mentions the split so a reviewer doesn't think there are three parallel implementations. Recommend a one-line header comment update or a TS path-only file naming convention you'll explain on Wednesday.

- `api/src/index.ts:35` — `// eslint-disable-next-line @typescript-eslint/no-unused-vars` above the error handler. Express's 4-arg signature requires `next` to be present for it to be recognized as an error handler — that's load-bearing, not dead code. Replace the eslint-disable with a comment explaining *why* `_next` is required (so a future reader doesn't delete it). Same goes for `_req`. The current eslint-disable reads like cargo-culted suppression.

- `api/src/auth.ts:38-40` — `clearCookieOptions()` does `const { maxAge: _maxAge, ...rest } = cookieOptions(); void _maxAge`. The `void _maxAge` is dead. A leading-underscore destructure is the standard escape hatch for "I'm intentionally discarding this." Fix: drop the `void _maxAge` line.

- `api/src/routes/dashboard.ts:7` — `RecentActivityKind` is exported from shared but `dashboard.ts` only uses it implicitly. Not blocking, but if a judge asks "why does shared export `RecentActivityKind`?" the answer should be "because the frontend uses it for type-narrowing the icon map" — and right now the frontend doesn't, because of the dashboard local-type issue above. Fix that and this clears up.

- `app/src/components/AppShell.tsx:17` and elsewhere — `max-w-[1120px]` is hardcoded. Design-system.md:74 says `mx-auto max-w-[1120px] w-full` is the canonical app container — but the value is duplicated across `AppShell` header and main. Not worth a refactor for a one-day build, but worth a one-line note in `AppShell.tsx` so the next person doesn't change one and not the other.

- `app/src/app/(app)/labour/_components/LabourForm.tsx:54-63` — `SubmitBody` is essentially `CreateLabourInput` from `@sred/shared` (which this PR just added). Fix: replace `SubmitBody` with `import type { CreateLabourInput } from '@sred/shared'`.

- `app/src/app/(app)/labour/_components/LabourForm.tsx:134` — `setError(\`Could not save: ${err.status}\`)` shows a bare HTTP status to the user. Same pattern in `LabourDetail.tsx:50`. Not embarrassing per se, but worth mapping at least 400 → "Please check your inputs." and 401 → "Your session expired, please sign in again." in a 5-minute pass. Will look much better in the demo than "Could not save: 400".

## Nice to fix if time permits

- `api/src/routes/labour.ts:290,382` — `RETURNING ${LABOUR_SELECT.replace(/l\./g, '')}` is a clever way to reuse the SELECT list, but a separate `LABOUR_RETURNING` constant would be 20 seconds of work and self-documenting.

- `api/src/routes/labour.ts:363-374` — The PATCH "if FK changed, look up the other half and re-verify" path runs a second SELECT after the validation phase. It's correct but races with concurrent updates. For one-day demo: fine. For Wednesday-defensibility: worth knowing this is intentional, not an oversight.

- `app/src/components/Badge.tsx:6-8` — Uses raw Tailwind palette (`bg-green-50`, `text-success`, `border-green-200`). Design-system.md prescribes this pattern (token text + raw-palette tint background), so it's consistent. No action needed; flagging only because a judge skimming for "design tokens vs hardcoded colors" might ask.

- `api/src/routes/dashboard.ts:24` — `date_trunc('week', (now() AT TIME ZONE $2))` returns a `timestamp without time zone`. Casting it to `::date` is correct, but the comment in `dashboard.ts:11-12` already calls out "swap to per-user timezone later" — good.

## Looks good

- Every SQL call in `api/src/routes/*.ts` is parameterized with `$n` placeholders. The dynamic PATCH builder in `labour.ts:308-353` only ever concatenates fixed column names (not user input) into the SET clause and uses positional params for values — that's the right way to do it.
- All five routers correctly apply `requireAuth` (auth router itself doesn't need it; `/login` and `/logout` are unauthenticated by design, `/me` has it on the route).
- Input validation at the API boundary is thorough — UUID format, ISO date format, enum membership, hours bounds (`&gt; 0 &amp;&amp; &lt;= 24`). Hand-written but consistent and tight.
- The bcrypt-against-dummy-hash on unknown email (auth.ts:54) is the right call for email-enumeration timing and is well-commented. Worth mentioning Wednesday.
- `clearCookieOptions()` matching `cookieOptions()` attributes (minus maxAge) is the correct RFC 6265 dance for a real cookie delete — well-commented.
- No `console.log` debug leftovers, no `any` types anywhere in the diff, no dead imports.
- Frontend correctly uses Server Components for data loading (`dashboard`, `labour list`, `labour detail`, `new labour`) and switches to Client Components only where needed (`LabourForm`, `LabourDetail`, `LogoutButton`, `NavLinks`, login). That story is defensible.
- `next.config.ts` turbopack root pin is a good catch — explains the `cd app &amp;&amp; yarn dev` ancestor-lockfile warning without papering over it.

Relevant file paths:
- /Users/paolouy/dev/sred-manager/app/src/app/(app)/labour/_lib/selectOptions.ts
- /Users/paolouy/dev/sred-manager/app/src/app/(app)/dashboard/page.tsx
- /Users/paolouy/dev/sred-manager/app/src/app/(app)/labour/page.tsx
- /Users/paolouy/dev/sred-manager/app/src/app/(app)/labour/[id]/page.tsx
- /Users/paolouy/dev/sred-manager/app/src/app/(app)/labour/_components/LabourForm.tsx
- /Users/paolouy/dev/sred-manager/app/src/app/(app)/labour/[id]/_components/LabourDetail.tsx
- /Users/paolouy/dev/sred-manager/api/src/auth.ts
- /Users/paolouy/dev/sred-manager/api/src/index.ts
- /Users/paolouy/dev/sred-manager/api/src/routes/labour.ts
- /Users/paolouy/dev/sred-manager/api/src/routes/dashboard.ts
- /Users/paolouy/dev/sred-manager/shared/src/types/dashboard.ts
- /Users/paolouy/dev/sred-manager/shared/src/types/labour.ts</result>
<usage><total_tokens>78551</total_tokens><tool_uses>56</tool_uses><duration_ms>242321</duration_ms></usage>
</task-notification>

### 2026-05-11T12:43:27Z
<task-notification>
<task-id>a45fff968a185a1a6</task-id>
<tool-use-id>toolu_01DVLPCwPCgobEDG2M1NMYqG</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-paolouy-dev-sred-manager/da4a2ff4-02a7-4ea2-94e6-d8ef8d9de34c/tasks/a45fff968a185a1a6.output</output-file>
<status>completed</status>
<summary>Agent "Curate Phase 1 prompts into PROMPTS.md" completed</summary>
<result>Curated 6 prompts. Top entry: `[worked]` — Build error pasted verbatim, zero paraphrasing.</result>
<usage><total_tokens>24993</total_tokens><tool_uses>7</tool_uses><duration_ms>57949</duration_ms></usage>
</task-notification>

### 2026-05-11T12:47:49Z
<task-notification>
<task-id>a14b014c9e73f253f</task-id>
<tool-use-id>toolu_01Amm1TcnFyjWVkYejcw7BEf</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-paolouy-dev-sred-manager/da4a2ff4-02a7-4ea2-94e6-d8ef8d9de34c/tasks/a14b014c9e73f253f.output</output-file>
<status>completed</status>
<summary>Agent "Build Phase 2 backend" completed</summary>
<result>Phase 2 backend is done. Typechecks pass on both `@sred/shared` and `@sred/api`.

## Files modified

- `/Users/paolouy/dev/sred-manager/shared/src/types/user.ts` — added `CreateEmployeeInput`, `UpdateEmployeeInput`, `EmployeeResponse`, `EmployeeListResponse`.
- `/Users/paolouy/dev/sred-manager/shared/src/types/project.ts` — added `CreateProjectInput`, `UpdateProjectInput`, `ProjectResponse`, `ProjectListResponse`.
- `/Users/paolouy/dev/sred-manager/api/src/routes/employees.ts` — full rewrite: `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `POST /:id/deactivate`, `POST /:id/reactivate`. `GET /` accepts `?status=active|inactive|all` (defaults `active`).
- `/Users/paolouy/dev/sred-manager/api/src/routes/projects.ts` — full rewrite, same shape as employees plus cross-ref validation for `parentProjectId` and `projectManagerId`.

`shared/src/index.ts` already re-exports `./types/user.js` and `./types/project.js`, so the new types are exported automatically — no edit needed.

## Shared types added beyond spec

None. The four interfaces per domain match the spec exactly.

## Judgment calls

- **Password minimum length:** Spec says `password` required, no policy. Set a floor of 8 chars in `parseCreateEmployee` — rejecting an empty string is a baseline. Easy to relax.
- **Email normalization:** Lowercased emails on insert and on PATCH update (matches the existing login flow in `auth.ts` which already calls `email.toLowerCase()` on lookup). Otherwise mixed-case duplicates would slip past the unique index.
- **Unique-violation handling:** Caught `code === '23505'` (Postgres `unique_violation`) on both POST and PATCH for `users.email` and surface as `409 { error: 'Email already in use' }`. PATCH can also race into a 409 if two clients both try to change an email — covered.
- **Optional-field passthrough on POST:** Used a dynamic INSERT column list so DB defaults (`hours_per_year=2080`, `regular_rate=0`, etc.) apply when caller omits the field. Explicit `null` for nullable cols (role/startDate/qualifications) is treated the same as omission since they default NULL anyway — caller can PATCH to null if needed later.
- **Cross-ref validation on projects:** `parentProjectId` and `projectManagerId` must reference rows in the caller's company. Returns 400 `Invalid \`parentProjectId\`` rather than 404 on a foreign-tenant id (same leak rationale doesn't apply here — the caller is providing the id, not asking about it). Also blocked `parentProjectId === :id` self-reference on PATCH.
- **Status filter validation:** `?status` accepts only `active|inactive|all`; anything else is a 400. Mirrors existing query-param validation in `labour.ts`.
- **Used FROM-clause UPDATE for company scoping** (`UPDATE users u SET ... FROM users me WHERE u.id = $x AND me.id = $caller AND u.company_id = me.company_id`). This makes scope enforcement happen in one round-trip — UPDATE affects 0 rows on cross-tenant, which the handler maps to 404.

## Confirmations

- **`POST /employees` returns 409 on email conflict:** Yes. Catches Postgres `23505` and returns `409 { error: 'Email already in use' }`. Same on `PATCH /employees/:id` if a caller renames to an in-use email.
- **Company-scoping returns 404 (not 403) on cross-tenant access:** Yes, on every `:id` endpoint — `GET`, `PATCH`, `POST /deactivate`, `POST /reactivate` — for both employees and projects. The scope is enforced inside the SQL via a join on the caller's company; non-matching rows simply don't return / don't update, and the handler maps `rowCount === 0` to 404.</result>
<usage><total_tokens>59685</total_tokens><tool_uses>25</tool_uses><duration_ms>183752</duration_ms></usage>
</task-notification>

### 2026-05-11T12:49:59Z
<task-notification>
<task-id>a7bde33b069067d2d</task-id>
<tool-use-id>toolu_017vrZ91debgZdrjUtnmAV81</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-paolouy-dev-sred-manager/da4a2ff4-02a7-4ea2-94e6-d8ef8d9de34c/tasks/a7bde33b069067d2d.output</output-file>
<status>completed</status>
<summary>Agent "Build Phase 2 frontend" completed</summary>
<result>All files in place, typecheck passes. Here's the report.

## Phase 2 Frontend — Done

### Files created

**Employees**
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/employees/page.tsx` — list with status filter + Add button
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/employees/new/page.tsx` — create form
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/employees/[id]/page.tsx` — server fetch + 404
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/employees/_components/EmployeeForm.tsx` — shared create/edit form (exports `userToFormInitial` helper)
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/employees/[id]/_components/EmployeeDetail.tsx` — view↔edit toggle + Deactivate/Reactivate

**Projects**
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/projects/page.tsx` — list with status filter + SR&amp;ED indicator + manager column
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/projects/new/page.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/projects/[id]/page.tsx` — also filters self out of parent-project options
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/projects/_components/ProjectForm.tsx` (exports `projectToFormInitial` helper)
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/projects/[id]/_components/ProjectDetail.tsx`

**Shared additions**
- `/Users/paolouy/dev/sred-manager/app/src/components/StatusFilter.tsx` — query-param-driven `&lt;select&gt;` (active|inactive|all). Removes the param when set to default to keep URLs clean. Exports `parseStatusFilter()` for server-side coercion. New primitive — design system was silent on filter dropdowns.
- `/Users/paolouy/dev/sred-manager/app/src/lib/employee-labels.ts` — `ACCESS_LEVEL_LABELS`, `PAID_TYPE_LABELS`, etc.
- `/Users/paolouy/dev/sred-manager/app/src/lib/project-labels.ts` — `PROJECT_TYPE_LABELS`, `PROJECT_PHASE_LABELS`, etc.

### Reused vs new

**Reused** — Button, Card, Field/SelectField/TextAreaField, Badge, Table primitives, ApiError, `clientApi`/`serverApi`, `formatDate`, `loadEmployees`/`loadProjects` from `app/(app)/labour/_lib/selectOptions.ts` (imported directly from both projects pages — no duplication), and all `@sred/shared` types (`User`, `Project`, `CreateEmployeeInput`, `UpdateEmployeeInput`, `EmployeeResponse`, `EmployeeListResponse`, `CreateProjectInput`, `UpdateProjectInput`, `ProjectResponse`, `ProjectListResponse`, `AccessLevel`, `PaidType`, `ProjectPhase`, `ProjectType`).

**New** — `StatusFilter` (no equivalent existed), label maps for employees/projects (mirrors the existing `labour-labels.ts` pattern).

### Design-system judgment calls

1. **Status filter dropdown style** — design-system has no spec. Built it as a compact inline `&lt;select&gt;` styled with the same token vocabulary as `SelectField` (border-border, bg-surface, focus-accent), but `py-1 text-xs` to fit beside the page-header H1. Worth promoting into `Field.tsx` as a `&lt;CompactSelect&gt;` if used again.
2. **SR&amp;ED indicator** — the prompt asked for an "SR&amp;ED orange '+' icon" but the design system explicitly bans the retro orange `#e07820` and forbids hard-coded hex. I used the `text-warning` (amber) token applied to a `+` glyph inline before the name, with `title`/`aria-label="SR&amp;ED project"`. Flag for the design-system agent: do we want a formal "SR&amp;ED" badge or icon component? Right now there's no token equivalent of "orange."
3. **Phase badge** — used the `concept` Badge variant for the `concept` phase in the detail view. Other phases render as plain text since the design system only defines `active` / `concept` / `neutral` badges. Worth a `development` variant later.
4. **Deactivate confirmation** — used `window.confirm` per the labour pattern. The design system has no modal primitive; if confirmation modals come up again, that's the cue to add one.
5. **Email immutability in edit mode** — locked the email field for `PATCH` (with helper text). Send only because: (a) `UpdateEmployeeInput = Partial&lt;Omit&lt;CreateEmployeeInput, 'password'&gt;&gt;` still includes email so the backend may accept it, but (b) email is the login identifier — changing it without a confirmation flow is risky. Easy to unlock later.
6. **Specified employee / Global project** — modeled as boolean `Yes/No` selects rather than checkboxes, matching the form's vertical/uniform field layout. No checkbox primitive exists yet in the design system.

### Contract assumptions for the backend agent

1. `GET /employees?status=active|inactive|all` and `GET /projects?status=active|inactive|all` — status param controls the default of `active` if omitted. The projects list page also calls `GET /employees?status=all` so it can join the project-manager IDs to names (including managers who are now inactive).
2. `POST /employees` returns **409** on email conflict (mapped to "An employee with this email already exists.").
3. `POST /projects` may return **409** on name conflict if the backend enforces that — the form already handles it ("A project with this name already exists."). If not enforced, it's dead code, no harm.
4. `PATCH /employees/:id` accepts `UpdateEmployeeInput` (everything except `password`); body sent omits `password` entirely.
5. `POST /employees/:id/deactivate`, `POST /employees/:id/reactivate`, `POST /projects/:id/deactivate`, `POST /projects/:id/reactivate` all return `{ ok: true }`.
6. `parentProjectId: null` is sent when the user picks "— None —". Same for `projectManagerId: null` on "— Unassigned —", `startDate` / `dueDate` empties, `description`, `qualifications`, `role`. Backend should treat `null` as "clear this field."
7. Nav already lists Projects + Employees and uses path-prefix matching, so the active state lights up automatically on `/employees`, `/employees/new`, `/employees/[id]` etc.

### Verification

`yarn workspace @sred/app run typecheck` — exit 0.</result>
<usage><total_tokens>75321</total_tokens><tool_uses>48</tool_uses><duration_ms>284675</duration_ms></usage>
</task-notification>

### 2026-05-11T12:55:52Z
<task-notification>
<task-id>a4f8c1d862d13c873</task-id>
<tool-use-id>toolu_01XA7zuNkjHwAUVRY7ihLfqs</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-paolouy-dev-sred-manager/da4a2ff4-02a7-4ea2-94e6-d8ef8d9de34c/tasks/a4f8c1d862d13c873.output</output-file>
<status>completed</status>
<summary>Agent "Review Phase 2 diff" completed</summary>
<result>Same `req.user!.userId` pattern — consistent with Phase 2.

I have enough now. Here's my review.

---

## Review of Phase 2 diff

### 🚨 Must fix before commit

None. SQL is parameterized end-to-end, dynamic column-list construction uses literal strings for column names (`cols.push('role')`, `push('first_name', …)`), every `:id` endpoint enforces `company_id` scoping, `requireAuth` is mounted via `router.use(requireAuth)` on both new routers.

### ⚠ Should fix

1. **`app/src/app/(app)/projects/_components/ProjectForm.tsx:127-128`** — error handler treats `409` as "A project with this name already exists." But `projects` has no UNIQUE constraint (`api/db/schema.sql:53-68` — only `name TEXT NOT NULL`, no `UNIQUE`). The backend `POST /projects` never returns 409. Dead branch and misleading copy if some other 409 ever bubbles up. Drop the `else if (err.status === 409)` clause, or add a UNIQUE constraint if same-name projects per-company should be rejected.

2. **`app/src/app/(app)/labour/_lib/selectOptions.ts:11,19`** — `loadEmployees()` / `loadProjects()` call `/employees` and `/projects` with no `?status=` param, so they default to `active`. Reused on `/projects/[id]` (line 31-32 in `app/src/app/(app)/projects/[id]/page.tsx`) when rendering the edit form: **if a project's currently-assigned manager (or parent project) has been deactivated, the dropdown won't include them**, so the form silently drops a valid existing assignment on save (the `value=""` falls through to `— Unassigned —` and the PATCH body sends `projectManagerId: null`). Fix: call these helpers with `?status=all` from the project detail page, or merge the project's currently-assigned manager/parent into the option list defensively.

3. **`api/src/routes/employees.ts:18-25` and `api/src/routes/projects.ts:18-23`** — `UUID_RE`, `ISO_DATE_RE`, `STATUS_FILTERS`, `isUuid`, `isIsoDate`, `isNonEmptyString` are now duplicated across three route files (also in `api/src/routes/labour.ts:18-46`). For one-day-build scope this is fine, but if a judge greps for it you'll want to be ready with: "extracting to a `validators.ts` is a 5-minute cleanup I deprioritized." Optionally extract to `api/src/lib/validators.ts`.

4. **`api/src/routes/employees.ts:182-293`** — `parseCreateEmployee` mostly mirrors `CreateEmployeeInput`, but the `ParsedCreateEmployee` interface re-declares every field with adjusted nullability. Not a duplicated type per se (it's a local parse result), but the shape divergence (`hoursPerYear: number | null` here vs. `hoursPerYear?: number` in shared) means the call site at `:344-348` has to special-case nulls. This is the **same pattern as Phase 1 labour**, so it's at least consistent — flagging it only so you're not surprised if a judge asks "why two shapes for the same thing?"

5. **`api/src/routes/employees.ts:495-508` and `api/src/routes/projects.ts:411-424`** — `setEmployeeStatus` and `setProjectStatus` are nearly identical with just the table name differing. Acceptable for the time budget but easy to point at as "one helper away."

### 💡 Nice to fix if time permits

6. **`api/src/routes/employees.ts:130`** — `const USER_RETURNING = USER_SELECT.replace(/u\./g, '')` — clever but a little surprising on first read; an inline comment explaining "RETURNING runs in the context of the INSERT target table, no alias allowed" would save a reader 30 seconds. Same goes for `projects.ts:95`.

7. **`api/src/routes/employees.ts:341-343`** — the `if (v.role !== null) maybe('role', v.role)` pattern dead-ends: `maybe` already short-circuits on `null`. The outer guard is a no-op. Same for `start_date`, `qualifications`, and the same pattern in `projects.ts:277-283`. Drop the outer `if`s.

8. **`api/src/routes/employees.ts:286-288`** — `reg as number | null` / `ot as number | null` / `hol as number | null` casts are fighting the type narrowing. Since the lines above already returned on `typeof reg === 'object'`, TS *should* narrow `reg` to `number | null`. If the narrowing isn't sticking, the cleaner fix is to refactor `parseRate` to return `{ ok: true; value } | { ok: false; error }` like the outer function does — but for a one-day build, the casts are fine.

9. **`api/src/routes/projects.ts:347-349`** — self-parent check (`b.parentProjectId === req.params.id`) is present, but transitive cycles (A → B → A) aren't checked. Almost certainly out of scope; flagging only because a judge sometimes asks "did you think about cycles?" — be ready to say "single-level guard intentionally; multi-level cycle detection is a future task."

10. **`app/src/app/(app)/projects/_components/ProjectForm.tsx:99,103-104`** — repeated `=== '' ? null : value` pattern; `toNullableTrimmed` exists (line 55) but isn't reused for non-trimmed cases. Trivial.

11. **`app/src/app/(app)/projects/page.tsx:43`** — comment says employee lookup uses `?status=all` "which is fine — we just need a lookup map" — good defensive choice, props for the comment. (No fix; positive note.)

12. **`app/src/components/StatusFilter.tsx:63-67`** — inline SVG data-URI with a hardcoded fill color `%2378716c` for the chevron. Color is hex-encoded `#78716c` (stone-500). If `design-system` tokens exist for this, you'd want a token; if not, fine. Mention to design-system agent on next pass.

13. **`app/src/app/(app)/employees/_components/EmployeeForm.tsx:187`** — `&lt;div /&gt;` placeholder to preserve grid layout when password field is hidden in edit mode. Works, but a comment ("preserve 2-col grid alignment when password slot is empty") would defuse "what is this?" questions.

14. **`app/src/app/(app)/employees/_components/EmployeeForm.tsx:124-138`** — the PATCH body always sends every field as a non-partial payload, even if the user changed nothing. The backend handles `'X' in b` as the "was-this-provided" gate, so this works, but it's slightly wasteful and means a stray Save click overwrites every column. For a one-day build this is fine.

### ✅ Looks good

Reviewed `api/src/routes/employees.ts`, `api/src/routes/projects.ts`, the four new shared type interfaces, `StatusFilter.tsx` / `status-filter.ts` split, and all six new app pages/components.

**Defensible points for Wednesday:**
- All SQL uses parameterized placeholders. Dynamic column-list construction in `INSERT`/`UPDATE` builds the column-name list from string literals only; user input only ever enters the query via `$n`.
- Every `:id` endpoint joins on `me.company_id` or filters by an explicitly-fetched `companyId` — cross-tenant access returns 404.
- Cross-references (parent project, project manager) are verified to live in the caller's company before insertion (`existsInCompany`).
- Bcrypt + 409 on email collision via `unique_violation` SQL state — cleanly mapped.
- StatusFilter / parseStatusFilter split is correct: `parseStatusFilter` lives in `app/src/lib/status-filter.ts` as a pure module (no `'use client'`, no React), so Server Components can import it without dragging in client runtime. `StatusFilter.tsx` re-exports the type for client-side ergonomics — fine.
- No type re-declaration: every shared-type usage imports from `@sred/shared`. Local interfaces (`EmployeeFormInitial`, `ProjectFormProps`, etc.) are genuine local prop shapes, not duplicates.
- Password field is correctly conditional in `EmployeeForm`: shown + required in create mode, omitted from the PATCH body in edit mode.
- No `console.log`, no `any`, no hardcoded URLs/secrets in the new code.

**Files reviewed:**
- `/Users/paolouy/dev/sred-manager/api/src/routes/employees.ts`
- `/Users/paolouy/dev/sred-manager/api/src/routes/projects.ts`
- `/Users/paolouy/dev/sred-manager/shared/src/types/user.ts`
- `/Users/paolouy/dev/sred-manager/shared/src/types/project.ts`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/employees/page.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/employees/new/page.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/employees/[id]/page.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/employees/_components/EmployeeForm.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/employees/[id]/_components/EmployeeDetail.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/projects/page.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/projects/new/page.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/projects/[id]/page.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/projects/_components/ProjectForm.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/projects/[id]/_components/ProjectDetail.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/components/StatusFilter.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/lib/status-filter.ts`
- `/Users/paolouy/dev/sred-manager/app/src/lib/employee-labels.ts`
- `/Users/paolouy/dev/sred-manager/app/src/lib/project-labels.ts`

The single material bug worth fixing before demo is **#2** (inactive manager/parent silently dropped from project edit). Everything else is polish.</result>
<usage><total_tokens>77099</total_tokens><tool_uses>44</tool_uses><duration_ms>195635</duration_ms></usage>
</task-notification>

### 2026-05-11T13:04:51Z
<task-notification>
<task-id>aea6db231bbe39070</task-id>
<tool-use-id>toolu_0117TFhS1g4rTsqcnZsqtvvq</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-paolouy-dev-sred-manager/da4a2ff4-02a7-4ea2-94e6-d8ef8d9de34c/tasks/aea6db231bbe39070.output</output-file>
<status>completed</status>
<summary>Agent "Build Phase 3 backend" completed</summary>
<result>Done. Summary below.

## Files created
- `/Users/paolouy/dev/sred-manager/api/src/routes/expenses.ts` — full CRUD; mirrors labour.ts shape but with company-scoping (via `JOIN users me` and `p.company_id = me.company_id`).
- `/Users/paolouy/dev/sred-manager/api/src/routes/search.ts` — single `GET /search` with `q` + `limit`; `q.length &lt; 2` returns empty arrays, missing `q` returns 400.
- `/Users/paolouy/dev/sred-manager/api/src/routes/reports.ts` — `GET /reports/monthly` and `GET /reports/yearly`, both single-trip with `SUM(...) FILTER (WHERE p.type='sred')`.
- `/Users/paolouy/dev/sred-manager/shared/src/types/search.ts`
- `/Users/paolouy/dev/sred-manager/shared/src/types/report.ts`

## Files modified
- `/Users/paolouy/dev/sred-manager/shared/src/types/expense.ts` — added `CreateExpenseInput`, `UpdateExpenseInput`, list/response types.
- `/Users/paolouy/dev/sred-manager/shared/src/index.ts` — re-exports `./types/search.js` and `./types/report.js`.
- `/Users/paolouy/dev/sred-manager/api/src/index.ts` — mounts the three new routers.

## Confirmations
- `yarn workspace @sred/shared run typecheck` — PASSED (exit 0).
- `yarn workspace @sred/api run typecheck` — PASSED (exit 0).
- `/search?q=` (param present but empty) → handler reaches the length check (`trimmed.length &lt; 2`) and returns `{ projects: [], employees: [] }` (200). Missing `q` entirely → 400 `{ error: '\`q\` is required' }`.
- `/search?q=a` (single char) → 200 with empty arrays; DB is never queried.
- Monthly/yearly: month bounds derived via `make_date($year,$month,1)` + `interval '1 month' - interval '1 day'`. The labour/expense `date` columns are tz-naive DATE, so "America/Toronto" is implicit (same convention as `dashboard.ts`). I documented this in a comment instead of pushing the tz through `date_trunc`, because applying `AT TIME ZONE` to a DATE either no-ops or introduces real off-by-one risk.

## Judgment calls (deviations from spec, called out)

1. **`expenses` table has no `company_id` column.** I company-scope every expense query by joining through `projects p ON p.id = e.project_id` and gating on `p.company_id = me.company_id`. Cross-tenant hits return 404, per the existing project memory. The `verifyForeignKeysInCompany` helper also enforces that new `employeeId`/`projectId` references live in the caller's company.

2. **`labour.ts` itself is not company-scoped today.** I noticed this while pattern-matching but intentionally did NOT touch it (hard rule #9: don't break Phase 1/2 routes). Flagging in case you want a follow-up PR — `GET /labour`, `/labour/:id`, etc. currently allow cross-tenant reads/writes. I made expenses do the right thing from the start.

3. **Reports tz semantics.** Spec asked for `date_trunc` with Toronto boundaries; I used `make_date` + `EXTRACT(MONTH FROM date)` because the source columns are DATE (no tz). `date_trunc('month', date AT TIME ZONE 'America/Toronto')` against a DATE silently casts to timestamp-without-tz first and re-applies the tz, which can shift the bucket by one day for dates near month boundaries depending on server tz. The simpler form is correct and matches user intent.

4. **`/search` employee detail** falls back to `email` when `role` is null (per spec). Search uses parameterized ILIKE with `%` / `_` / `\` escaping so user input can't act as wildcards. Active-only on both tables, as specified.

5. **No new shared types beyond the spec.** Everything in `expense.ts`, `search.ts`, `report.ts` matches what you provided verbatim.</result>
<usage><total_tokens>75813</total_tokens><tool_uses>28</tool_uses><duration_ms>243597</duration_ms></usage>
</task-notification>

### 2026-05-11T13:08:13Z
<task-notification>
<task-id>a7d0e7f8da7afc3da</task-id>
<tool-use-id>toolu_01PAxxqVxkVG9Ax9kyFGhweB</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-paolouy-dev-sred-manager/da4a2ff4-02a7-4ea2-94e6-d8ef8d9de34c/tasks/a7d0e7f8da7afc3da.output</output-file>
<status>completed</status>
<summary>Agent "Build Phase 3 frontend" completed</summary>
<result>Done. Phase 3 frontend slice is complete.

## Files created

**Expenses (clone of labour):**
- `/Users/paolouy/dev/sred-manager/app/src/lib/expense-labels.ts`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/expenses/page.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/expenses/new/page.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/expenses/[id]/page.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/expenses/_components/ExpenseForm.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/expenses/[id]/_components/ExpenseDetail.tsx`

**Global search:**
- `/Users/paolouy/dev/sred-manager/app/src/components/GlobalSearch.tsx`

**Reports:**
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/reports/page.tsx`
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/reports/_components/ReportsClient.tsx`

## Files modified

- `/Users/paolouy/dev/sred-manager/app/src/components/AppShell.tsx` — wired `&lt;GlobalSearch /&gt;` into the right cluster (before user name), added `no-print` to the header.
- `/Users/paolouy/dev/sred-manager/app/src/app/globals.css` — `@media print { .no-print { display: none !important; } }` plus white-page overrides.
- `/Users/paolouy/dev/sred-manager/app/src/lib/format.ts` — added `formatCurrency` (`$1,234.56`).

NavLinks already contained Expenses + Reports — no change required.

## Reuse vs new

**Reused:**
- `Button`, `Card`, `Field`/`SelectField`/`TextAreaField`, `Table` family (incl. `EmptyTableState`), `ApiError`, `clientApi`/`serverApi`, `formatDate`/`formatHours`, `PROJECT_TYPE_LABELS`.
- `loadEmployees` / `loadProjects` from `app/(app)/labour/_lib/selectOptions` — imported directly into both `expenses/new` and `expenses/[id]` (and `reports/page.tsx`), per the brief. The cross-route import is a little tight, but the alternative (a `shared/_lib`) felt like premature abstraction during a one-day build. Worth promoting to `src/lib/select-options.ts` later.
- The structural patterns (page header layout, view↔edit detail toggle, error-message branching on `ApiError.status`) are line-for-line clones of labour.

**New (with justification):**
- `formatCurrency` — no existing currency helper.
- `GlobalSearch` — no existing combobox/dropdown primitive; the spec forbade adding `cmdk`/`downshift`. Implemented with `AbortController`, debounce, latest-query ref, keyboard nav, click-outside, ARIA combobox semantics.
- `ReportsClient` — bespoke (tabs + filter form + result tables). Reuses Card/Table/SelectField; the tab buttons match the active-nav-link styling (border-b-2, accent).
- `ExpenseForm`/`ExpenseDetail` — separate from labour because the field set differs (cost vs hours, PO number, no labour-time). Kept the shapes parallel so a future refactor could extract.

## Design-system silences and judgment calls

- **Dropdown styling** (search results): doc has no listbox/combobox spec. Used `rounded-md border border-border bg-surface shadow-md` (matches the doc's "Elevated `shadow-md`" rule for popovers), `divide`d sections with `border-b border-border`, section headers as `text-[10px] uppercase tracking-wide text-text-muted`, active item uses `bg-surface-hover`. Width is fixed at `w-72` for clarity; the input is `w-44 md:w-56`.
- **Tabs**: doc has no tab spec. Reused the top-nav active-link treatment (`-mb-px` + `border-b-2 border-accent`) so the visual language stays one accent.
- **Radio inputs** for project type: native radios with `accent-accent` — minimal, matches the rest of the form vibe. Doc is silent.
- **Print CSS**: kept tight per the brief — `.no-print` on the AppShell header and the report-controls card; the print page strips the chrome and shows just the result card. Forced `#fff` background + `#000` text in print to avoid wasting ink on the warm-gray bg.
- **Totals row**: `bg-surface-hover font-medium` — visually grouped with the table without introducing a new pattern.

## Backend contract assumptions

These are the shapes/endpoints the backend agent must match:

1. **`GET /expenses?limit=50`** → `ExpenseListResponse` (`{ entries: ExpenseWithRelations[], total: number }`).
2. **`GET /expenses/:id`** → `ExpenseWithRelationsResponse`. 404 when not found.
3. **`POST /expenses`** with `CreateExpenseInput` → `{ entry: Expense }`. `objectiveEvidence` may be omitted (defaults to `none`).
4. **`PATCH /expenses/:id`** with `UpdateExpenseInput` (we currently send the full body) → `{ entry: Expense }`.
5. **`DELETE /expenses/:id`** → `{ ok: true }`.
6. **`GET /search?q=&lt;text&gt;`** → `SearchResponse` (`{ projects, employees }`). I send `q` even for length 1, but the frontend only opens the dropdown for length ≥ 2 — backend can no-op for short queries or just return empty.
7. **`GET /reports/monthly?year=&lt;n&gt;&amp;month=&lt;1-12&gt;&amp;projectId=&lt;uuid&gt;&amp;type=sred|internal`** → `MonthlyReportResponse`. `projectId` and `type` are optional; absence means "all".
8. **`GET /reports/yearly?year=&lt;n&gt;&amp;projectId=&lt;uuid&gt;&amp;type=sred|internal`** → `YearlyReportResponse`. Same optional semantics. Frontend pads to 12 rows; backend may return ≤12 (only months with data).

Typecheck and lint both exit 0.</result>
<usage><total_tokens>90572</total_tokens><tool_uses>66</tool_uses><duration_ms>413475</duration_ms></usage>
</task-notification>

### 2026-05-11T13:26:24Z
Okay, let's revisit the design.Spawn the designer agent.The current styling feels too constrained in space.It's too dark.And let's use a modern font.Also, when rendering tables, make sure the entire row is clickable.

Double check the prototype that is sent.When viewing an employees you don't just view the employee detail, you also see the recent labor and recent expenses.I envisioned that as a left section on the screen and having a main section that occupies majority of the screen as the primary info

### 2026-05-11T13:45:24Z
Can we use a white background for this? And the sizing still feels too constrained. We didn't have to follow the prototype that was the old version.We are trying to modernize it so don't use it as your source of truth.

### 2026-05-11T13:55:49Z
Do I need to restart it because I don't see the changes.

### 2026-05-11T13:57:09Z
It's updated now, but I still see black background.

### 2026-05-11T13:59:37Z
Start building the preference screen.
Notice that there is a time zone selection. We need to create a single time zone formatter so that it always respect the t the the user's time zone and not the browsers tz.

### 2026-05-11T14:05:18Z
<task-notification>
<task-id>a06f336f3b6c61d70</task-id>
<tool-use-id>toolu_018YAfi3ngsQ7GvBZrayvreD</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-paolouy-dev-sred-manager/da4a2ff4-02a7-4ea2-94e6-d8ef8d9de34c/tasks/a06f336f3b6c61d70.output</output-file>
<status>completed</status>
<summary>Agent "Build preferences backend + extend session" completed</summary>
<result>Both workspaces typecheck clean.

---

## Files modified
- `/Users/paolouy/dev/sred-manager/api/src/routes/auth.ts` — extended `UserAuthRow`, `toLoginResponse`, and both SELECTs (`/login` and `/me`) to include `timezone` and `language`.
- `/Users/paolouy/dev/sred-manager/api/src/index.ts` — imported and mounted the preferences router at `/preferences`.

## Files created
- `/Users/paolouy/dev/sred-manager/api/src/routes/preferences.ts` — 4 routes behind `requireAuth`:
  - `GET /preferences/user` → `{ user: SessionUser }` for the calling user
  - `PATCH /preferences/user` → updates only `req.user!.userId`'s row; validates `timezone` against `SUPPORTED_TIMEZONES`, `language` against `SUPPORTED_LANGUAGES`, `role` as nullable string with 120-char cap
  - `GET /preferences/company` → `{ company: Company }` scoped via `JOIN users me ON me.id = $1 WHERE c.id = me.company_id`
  - `PATCH /preferences/company` → admin-only (`accessLevel !== 'admin'` → 403 `'Admin access required'`); UPDATE joins through `me.company_id` so it can only mutate the caller's company

## Confirmations
- `/auth/login` and `/auth/me` now both return `timezone` and `language` in the user payload (`toLoginResponse` mapper updated, both SELECT lists include the columns).
- `PATCH /preferences/user` validates `timezone` against `SUPPORTED_TIMEZONES` via `SUPPORTED_TIMEZONES.some((t) =&gt; t.value === input)` (and same for `SUPPORTED_LANGUAGES`).
- `PATCH /preferences/company` returns `403 { error: 'Admin access required' }` for any non-admin caller — first check in the handler, before body parsing.

## Judgment calls
1. **`GET /preferences/user` queries the DB rather than echoing `req.user`** — the JWT only carries `userId/email/accessLevel`, but the response needs `firstName/lastName/timezone/language`. Mirrors how `/auth/me` works.
2. **`COMPANY_SELECT` uses `c.` aliased columns and is reused for both the GET join and the PATCH `RETURNING`** — the PATCH uses `UPDATE companies c ... FROM users me`, and Postgres accepts aliased columns in `RETURNING` when there's a `FROM` join (same approach the existing `employees.ts` PATCH uses with `USER_SELECT`).
3. **Trim on nullable text fields, but don't reject empty strings** — sending `""` is treated as a legitimate "set this to empty string" and stored as-is after trim. If the product wants empty-string-means-clear, that's a one-line tweak, but the spec said "allow null (means 'clear this field')" so I kept null and string as distinct inputs.
4. **No body-level guard against unknown keys** — matches the codebase pattern (`employees.ts`/`projects.ts` also silently ignore unknown fields). The `"No updatable fields provided"` check catches the case where the body has zero recognized fields.
5. **Did not add `requireAdmin` middleware** — only one route needs it; an inline check is clearer than a new abstraction. The pattern can be promoted later if a second admin-only route appears.</result>
<usage><total_tokens>58208</total_tokens><tool_uses>25</tool_uses><duration_ms>159783</duration_ms></usage>
</task-notification>

### 2026-05-11T14:11:53Z
<task-notification>
<task-id>a1ab9aa218c29f5a1</task-id>
<tool-use-id>toolu_01H8dyY3VfyKeUfuszgWGKh9</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-paolouy-dev-sred-manager/da4a2ff4-02a7-4ea2-94e6-d8ef8d9de34c/tasks/a1ab9aa218c29f5a1.output</output-file>
<status>completed</status>
<summary>Agent "Build preferences frontend + tz formatter" completed</summary>
<result>Done. Summary follows.

---

## Files created

- `/Users/paolouy/dev/sred-manager/app/src/lib/timezone-context.tsx` — `&lt;TimezoneProvider&gt;`, `useTimezone()`, `useFormatters()`. Hook throws if used outside the provider.
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/preferences/page.tsx` — user prefs (server).
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/preferences/company/page.tsx` — company prefs (server, gates form by `accessLevel === 'admin'`).
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/preferences/_components/PreferencesNav.tsx` — sub-nav.
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/preferences/_components/UserPreferencesForm.tsx` — email (disabled), role, language, timezone.
- `/Users/paolouy/dev/sred-manager/app/src/app/(app)/preferences/_components/CompanyPreferencesForm.tsx` — sectioned (Identity / Address / Contact / Operations) two-column grid; disabled for non-admins.

## Files modified

- `/Users/paolouy/dev/sred-manager/app/src/lib/format.ts` — new tz-required signatures + new helpers (`formatDateTime`, `formatLongDate`, `formatInteger`, `formatRate`).
- `/Users/paolouy/dev/sred-manager/app/src/lib/auth.ts` — `SessionUser` is now a re-export from `@sred/shared`.
- `/Users/paolouy/dev/sred-manager/app/src/components/AppShell.tsx` — wraps children in `&lt;TimezoneProvider tz={user.timezone}&gt;`.
- All 9 callers swept:
  - Server (pull `tz` from `getCurrentUser().timezone`): `dashboard/page.tsx`, `employees/[id]/page.tsx`, `projects/page.tsx`, `labour/page.tsx`, `expenses/page.tsx`.
  - Client (use `useFormatters()`): `employees/[id]/_components/EmployeeDetail.tsx`, `projects/[id]/_components/ProjectDetail.tsx`, `labour/[id]/_components/LabourDetail.tsx`, `expenses/[id]/_components/ExpenseDetail.tsx`.

## New `format.ts` signatures

```ts
export function formatDate(value: string | null | undefined, tz: string): string
export function formatLongDate(value: string | Date, tz: string): string
export function formatDateTime(value: string | null | undefined, tz: string): string
export function formatRelativeTime(value: string | Date, tz: string): string
export function formatHours(value: number | null | undefined): string
export function formatInteger(value: number): string
export function formatRate(value: number): string
export function formatCurrency(value: number | null | undefined): string
```

All date functions use `Intl.DateTimeFormat('en-CA', { timeZone: tz, ... })`. `formatDate` returns `YYYY-MM-DD` ISO-style. `formatDateTime` strips the `en-CA` comma so it reads `2026-05-11 14:32`.

## Callers found beyond the 9 listed

- `app/src/app/(app)/dashboard/page.tsx` had a direct `new Date().toLocaleDateString(undefined, …)` for the "Welcome … (today's date)" subtitle. Replaced with new `formatLongDate(new Date(), user.timezone)`.
- `app/src/app/(app)/employees/[id]/_components/EmployeeDetail.tsx` had a local `formatRate` using `toLocaleString` and `employee.hoursPerYear.toLocaleString()` inline. Both moved to `format.ts` (`formatRate`, `formatInteger`).

Final grep confirms zero `toLocaleString` / `toLocaleDateString` / `new Intl.*` outside `format.ts`.

## Design-system silences I had to decide

- **Sub-nav style for `/preferences` tabs**: design-system.md only specifies the global top-nav (rounded pill, `bg-accent-soft`). I chose an underlined tab pattern (border-bottom, `border-accent` when active) so it reads as nested navigation rather than competing with the top nav. Same color tokens as the top nav (`text-accent`, `text-text-muted`, `border-border-strong` on hover). If you'd prefer the pill style here too, swap the className in `PreferencesNav.tsx`.
- **Two-column form grid for company prefs**: design-system.md doesn't have a form-layout primitive. I followed the `EmployeeForm` precedent: `grid gap-6 sm:grid-cols-2` inside `space-y-6` blocks, with section headers (`text-lg font-semibold tracking-tight`) separating Identity / Address / Contact / Operations. `space-y-10` between sections per the design-system "between form sections" guidance.
- **Read-only treatment for non-admin company prefs**: design-system.md doesn't specify a "notice" pattern. I used `bg-accent-soft text-accent border-border` (same palette as the info badge in the badge spec) with `role="note"`.

## Verification

- `yarn workspace @sred/app run typecheck` — exit 0.
- `yarn workspace @sred/app run lint` — exit 0.</result>
<usage><total_tokens>117748</total_tokens><tool_uses>101</tool_uses><duration_ms>515914</duration_ms></usage>
</task-notification>

### 2026-05-11T14:19:40Z
Let's also add localization. Let's do Spanish, Tagalog and French for now.

### 2026-05-11T14:47:23Z
Let's update the dashboard screen and instead instead of showing a bunch of tile and the list, let's make it more visually appealing.

### 2026-05-11T14:47:33Z
Let's update the dashboard screen and instead instead of showing a bunch of tile and the list, let's make it more visually appealing. lets plan this
