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

/**
 * Best-effort extraction of a server-supplied error message from a thrown
 * `ApiError`. The API's convention is `{ error: string }` (and occasionally
 * `{ message: string }`); falls back to the generic message when nothing
 * usable is present.
 */
export function getServerErrorMessage(
  err: unknown,
  fallback: string,
): string {
  if (!(err instanceof ApiError)) return fallback
  const body = err.body
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>
    if (typeof obj.error === 'string' && obj.error.trim() !== '') {
      return obj.error
    }
    if (typeof obj.message === 'string' && obj.message.trim() !== '') {
      return obj.message
    }
  }
  return fallback
}
