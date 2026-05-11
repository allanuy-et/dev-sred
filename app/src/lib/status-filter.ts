// Pure module: no React, no client-only APIs. Safe to import from Server
// Components and Client Components alike.

export type StatusFilterValue = 'active' | 'inactive' | 'all'

/** Coerce an arbitrary `?status=…` query value into a typed status filter. */
export function parseStatusFilter(raw: string | undefined): StatusFilterValue {
  if (raw === 'inactive' || raw === 'all') return raw
  return 'active'
}
