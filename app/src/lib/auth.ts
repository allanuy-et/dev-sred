import type { User } from '@sred/shared'

// Types only — no Next.js server imports — so this module is safe to import
// from anywhere (Server Components, Client Components, or shared utilities).
//
// For functions, import from one of these instead:
//   - `@/lib/auth.server` (getCurrentUser; Server Components only)
//   - `@/lib/auth.client` (logout; Client Components only)

export type SessionUser = Pick<
  User,
  'id' | 'email' | 'firstName' | 'lastName' | 'accessLevel'
>
