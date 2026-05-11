// Types only — no Next.js server imports — so this module is safe to import
// from anywhere (Server Components, Client Components, or shared utilities).
//
// For functions, import from one of these instead:
//   - `@/lib/auth.server` (getCurrentUser; Server Components only)
//   - `@/lib/auth.client` (logout; Client Components only)
//
// `SessionUser` is re-exported from `@sred/shared` so the backend and frontend
// share a single source of truth (including `timezone` + `language`).
export type { SessionUser } from '@sred/shared'
