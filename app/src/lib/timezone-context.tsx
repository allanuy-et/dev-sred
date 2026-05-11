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
 * Client-only Intl-locale context. Set once in `<AppShell>` from the session
 * user's `language` (mapped via `LOCALE_TO_INTL`). Sits alongside
 * `TimezoneProvider` so the two preferences can move independently, but both
 * feed into the same `useFormatters()` hook.
 *
 * Falls back to `'en-CA'` when read outside a provider — formatter callers
 * should never be inside `<AppShell>` without a locale, but this keeps the
 * hook usable from one-off contexts (e.g. login) without a provider.
 */
const LocaleContext = createContext<string | null>(null)

export function LocaleProvider({
  locale,
  children,
}: {
  locale: string
  children: ReactNode
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  )
}

/** Get the active Intl locale string, defaulting to `en-CA`. */
export function useIntlLocale(): string {
  return useContext(LocaleContext) ?? 'en-CA'
}

/**
 * Tz + locale bound formatters for Client Components. Stable identity per
 * (tz, locale) so it can sit in `useMemo` deps safely.
 */
export function useFormatters() {
  const tz = useTimezone()
  const locale = useIntlLocale()
  return useMemo(
    () => ({
      formatDate: (v: string | null | undefined) =>
        fmt.formatDate(v, tz, locale),
      formatDateTime: (v: string | null | undefined) =>
        fmt.formatDateTime(v, tz, locale),
      formatRelativeTime: (v: string | Date) =>
        fmt.formatRelativeTime(v, tz, locale),
      formatHours: (v: number | null | undefined) => fmt.formatHours(v, locale),
      formatCurrency: (v: number | null | undefined) =>
        fmt.formatCurrency(v, locale),
      formatInteger: (v: number) => fmt.formatInteger(v, locale),
      formatRate: (v: number) => fmt.formatRate(v, locale),
    }),
    [tz, locale],
  )
}
