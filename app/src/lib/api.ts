// Types and error class shared by server-side and client-side API helpers.
// Pure TS, no Next.js imports — safe to import from anywhere.
//
// For request helpers, import from one of these instead:
//   - `@/lib/api.server` (Server Components only; uses `next/headers`)
//   - `@/lib/api.client` (Client Components; goes through the /api rewrite)

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  /**
   * Throw an `ApiError` for non-2xx responses. Defaults to `true`. Set to
   * `false` if you want to inspect the status code (e.g. distinguishing 401).
   */
  throwOnError?: boolean
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}
