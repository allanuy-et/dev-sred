/**
 * Date/number formatting — the **single** source of truth for how the app
 * renders dates. Every date in the app is rendered in the **user's selected
 * timezone**, never the browser's. Callers must pass `tz` explicitly: there
 * is no silent fallback to `Intl`'s default zone.
 *
 * Locale follows the same contract: every formatter accepts an optional Intl
 * locale string (e.g. `en-CA`, `fr-CA`, `es`, `en-PH`). It defaults to
 * `en-CA` so legacy callers keep working, but new callers should pass the
 * locale that corresponds to the user's `language` preference (see
 * `LOCALE_TO_INTL` in `@/lib/i18n`).
 *
 * In Client Components, use `useFormatters()` from `@/lib/timezone-context`
 * which pulls the tz + locale from context.  In Server Components, pull tz
 * from `getCurrentUser().timezone` and locale via `getIntlLocale(user.language)`.
 *
 * Pure / sync / no React or Next.js imports — safe to import anywhere.
 */

// Default Intl locale used when a caller doesn't pass one. `en-CA` gives
// ISO-like YYYY-MM-DD output that matches the backend's date strings and
// reads cleanly for the SR&ED accounting context.
const DEFAULT_LOCALE = 'en-CA'

/** Format an ISO or yyyy-mm-dd string as `YYYY-MM-DD` in the given timezone. */
export function formatDate(
  value: string | null | undefined,
  tz: string,
  locale: string = DEFAULT_LOCALE,
): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * Format a date as a long, human-friendly string (e.g. `Monday, May 11, 2026`)
 * in the given timezone. Used for prose / page-header chrome — not data cells.
 */
export function formatLongDate(
  value: string | Date,
  tz: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/**
 * Format an ISO timestamp as `YYYY-MM-DD HH:MM` in the given timezone.
 * Use this when time-of-day matters (e.g. activity timestamps that crossed
 * midnight).
 */
export function formatDateTime(
  value: string | null | undefined,
  tz: string,
  locale: string = DEFAULT_LOCALE,
): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  // `en-CA` with these options renders as `2026-05-11, 14:32` — the comma is
  // unavoidable. Strip it for a cleaner look.
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(',', '')
}

/**
 * Human-readable relative time (e.g. `2 hours ago`, `in 3 days`).
 *
 * `tz` is accepted for API consistency and future-proofing (if we ever
 * render "today" / "tomorrow", that decision is timezone-dependent). The
 * diff-in-seconds math is timezone-agnostic.
 */
export function formatRelativeTime(
  value: string | Date,
  tz: string,
  locale: string = DEFAULT_LOCALE,
): string {
  // Reference `tz` so unused-arg lint stays quiet and the signature contract is
  // honored — every caller must pass it.
  void tz
  const ts =
    typeof value === 'string' ? new Date(value).getTime() : value.getTime()
  if (Number.isNaN(ts)) return ''

  const diffSeconds = Math.round((ts - Date.now()) / 1000)
  const abs = Math.abs(diffSeconds)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (abs < 60) return rtf.format(diffSeconds, 'second')
  if (abs < 3_600) return rtf.format(Math.round(diffSeconds / 60), 'minute')
  if (abs < 86_400) return rtf.format(Math.round(diffSeconds / 3_600), 'hour')
  if (abs < 604_800) return rtf.format(Math.round(diffSeconds / 86_400), 'day')
  if (abs < 2_629_800)
    return rtf.format(Math.round(diffSeconds / 604_800), 'week')
  if (abs < 31_557_600)
    return rtf.format(Math.round(diffSeconds / 2_629_800), 'month')
  return rtf.format(Math.round(diffSeconds / 31_557_600), 'year')
}

/** Format hours as `1.5 h`. Returns `—` for null/undefined. No tz needed. */
export function formatHours(
  value: number | null | undefined,
  locale: string = DEFAULT_LOCALE,
): string {
  if (value === null || value === undefined) return '—'
  return `${value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} h`
}

/** Format an integer with thousands separators, e.g. `1,234`. */
export function formatInteger(
  value: number,
  locale: string = DEFAULT_LOCALE,
): string {
  return value.toLocaleString(locale, { maximumFractionDigits: 0 })
}

/** Format an hourly rate as `$25.00/hr`. */
export function formatRate(
  value: number,
  locale: string = DEFAULT_LOCALE,
): string {
  return `${formatCurrency(value, locale)}/hr`
}

/**
 * Format a monetary value as `$1,234.56`. Always shows two decimal places.
 * Returns `—` for null/undefined. Uses USD shape but with no explicit currency
 * code — the dollar sign is generic enough for CA + US, and avoids the API
 * having to choose. No tz needed.
 */
export function formatCurrency(
  value: number | null | undefined,
  locale: string = DEFAULT_LOCALE,
): string {
  if (value === null || value === undefined) return '—'
  return `$${value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
