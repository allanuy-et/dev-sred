import { ApiError, type ApiFetchOptions } from './api'

/**
 * Browser-side `fetch` that goes through Next.js's `/api/:path*` rewrite and
 * uses `credentials: 'include'` so the session cookie is sent. Returns the
 * parsed JSON body.
 */
export async function clientApi<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, headers, throwOnError = true, ...rest } = options

  const init: RequestInit = {
    ...rest,
    headers: {
      ...(body !== undefined && { 'content-type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include',
  }

  const url = `/api${path.startsWith('/') ? path : `/${path}`}`
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

/**
 * Multipart file upload helper. Browser-side. Each file is appended as a
 * `files` field — matches the server's `upload.array('files', ...)`.
 */
export async function uploadFiles<T>(path: string, files: File[]): Promise<T> {
  const fd = new FormData()
  files.forEach((f) => fd.append('files', f))
  const url = `/api${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: fd,
  })
  const parsed = (await res.json().catch(() => null)) as unknown
  if (!res.ok) {
    throw new ApiError(
      `Upload failed: ${res.status} ${res.statusText}`,
      res.status,
      parsed,
    )
  }
  return parsed as T
}
