import { cookies } from 'next/headers'

import { ApiError, type ApiFetchOptions } from './api'

/**
 * Backend API base URL for Server Components. Direct call — the in-process
 * Next.js rewrite only applies to browser fetches.
 */
const SERVER_API_URL = process.env.API_URL ?? 'http://localhost:4000'

/**
 * Server-side `fetch` against the backend that forwards the incoming request's
 * cookies (so the session cookie travels). Returns the parsed JSON body.
 */
export async function serverApi<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')

  const { body, headers, throwOnError = true, ...rest } = options

  const init: RequestInit = {
    ...rest,
    headers: {
      ...(body !== undefined && { 'content-type': 'application/json' }),
      ...(cookieHeader && { cookie: cookieHeader }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: rest.cache ?? 'no-store',
  }

  const url = `${SERVER_API_URL}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, init)
  const parsed = (await res.json().catch(() => null)) as unknown

  if (!res.ok && throwOnError) {
    throw new ApiError(
      `Request failed: ${res.status} ${res.statusText}`,
      res.status,
      parsed,
    )
  }

  return parsed as T
}
