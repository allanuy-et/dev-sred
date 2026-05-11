/** Format a date string (ISO or yyyy-mm-dd) as a short, locale-aware date. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Human-readable relative time (e.g. "2 hours ago", "in 3 days"). */
export function formatRelativeTime(value: string | Date): string {
  const ts = typeof value === 'string' ? new Date(value).getTime() : value.getTime()
  if (Number.isNaN(ts)) return ''

  const diffSeconds = Math.round((ts - Date.now()) / 1000)
  const abs = Math.abs(diffSeconds)

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

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

/** Format hours as `1.5 h`. Returns `—` for null/undefined. */
export function formatHours(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} h`
}

/**
 * Format a monetary value as `$1,234.56`. Always shows two decimal places.
 * Returns `—` for null/undefined. Uses USD shape but with no explicit currency
 * code — the dollar sign is generic enough for CA + US, and avoids the API
 * having to choose.
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
