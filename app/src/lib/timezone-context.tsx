'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

import * as fmt from './format'

/**
 * Client-only timezone context. Set once in `<AppShell>` from the session
 * user's `timezone` — every formatter hook reads from it so no client
 * component ever has to thread `tz` through props.
 *
 * Server Components do *not* read from this context — they pull tz from
 * `getCurrentUser().timezone` and pass it to the format functions directly.
 */
const TimezoneContext = createContext<string | null>(null)

export function TimezoneProvider({
  tz,
  children,
}: {
  tz: string
  children: ReactNode
}) {
  return (
    <TimezoneContext.Provider value={tz}>{children}</TimezoneContext.Provider>
  )
}

/** Get the active timezone. Throws if used outside `<TimezoneProvider>`. */
export function useTimezone(): string {
  const tz = useContext(TimezoneContext)
  if (!tz) {
    throw new Error('useTimezone must be used inside <TimezoneProvider>')
  }
  return tz
}

/**
 * Tz-bound formatters for Client Components. Stable identity per tz so it
 * can sit in `useMemo` deps safely.
 */
export function useFormatters() {
  const tz = useTimezone()
  return useMemo(
    () => ({
      formatDate: (v: string | null | undefined) => fmt.formatDate(v, tz),
      formatDateTime: (v: string | null | undefined) =>
        fmt.formatDateTime(v, tz),
      formatRelativeTime: (v: string | Date) => fmt.formatRelativeTime(v, tz),
      formatHours: fmt.formatHours,
      formatCurrency: fmt.formatCurrency,
    }),
    [tz],
  )
}
