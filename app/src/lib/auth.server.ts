import { ApiError } from './api'
import { serverApi } from './api.server'
import type { SessionUser } from './auth'

/**
 * Fetch the currently authenticated user from the backend. Returns `null` if
 * no session cookie is present or the backend rejects it.
 *
 * Server-only: forwards the incoming `cookie` header to the backend.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const { user } = await serverApi<{ user: SessionUser }>('/auth/me')
    return user
  } catch (err) {
    // Treat any API error (401, 5xx, network) as "not logged in" so the layout
    // sends the user to /login instead of crashing.
    if (err instanceof ApiError) return null
    throw err
  }
}
