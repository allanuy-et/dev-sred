---
name: API plumbing
description: How frontend talks to the backend — rewrite, server vs client fetch, cookie auth
type: project
---

The frontend never constructs absolute backend URLs in the browser. `app/next.config.ts` rewrites `/api/:path*` → `${API_URL}/:path*` (defaults to `http://localhost:4000`). Auth is cookie-based.

**Why:** Keeps the browser same-origin (cookie auth is simpler, no CORS), but Server Component fetches don't go through the rewrite — they must hit the backend directly and forward the incoming `cookie` header manually.

**How to apply:**
- Use the helpers in `app/src/lib/api.ts`:
  - `serverApi<T>(path, opts)` — Server Components only. Reads cookies via `await cookies()`, forwards them, hits `process.env.API_URL` directly. `cache: 'no-store'` by default.
  - `clientApi<T>(path, opts)` — Browser. Goes through `/api/...` with `credentials: 'include'`.
  - Both throw `ApiError` (with `.status`) on non-2xx by default; pass `throwOnError: false` to inspect manually.
- `getCurrentUser()` in `app/src/lib/auth.ts` is the canonical session check for layouts (returns `SessionUser | null`).
- Route group `(app)/layout.tsx` does the gate: `getCurrentUser()` → `redirect('/login')` if null → wraps in `<AppShell>`.
- Login form posts to `/auth/login`; logout via `LogoutButton` posts to `/auth/logout` then `router.push('/login')`.
