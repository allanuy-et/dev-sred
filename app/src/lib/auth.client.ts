import { clientApi } from './api.client'

/** Client-side logout: clears the session cookie via the backend. */
export async function logout(): Promise<void> {
  await clientApi<{ ok: boolean }>('/auth/logout', { method: 'POST' })
}
