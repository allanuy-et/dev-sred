'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

export interface DateRangeFilterProps {
  initialFrom: string
  initialTo: string
  /** Search-param key for the start date. Defaults to `from`. */
  fromParam?: string
  /** Search-param key for the end date. Defaults to `to`. */
  toParam?: string
}

/**
 * URL-driven date-range filter — two inline date inputs (from / to).
 * Pushes to the URL on change so the server page re-fetches the filtered list.
 * Empty value removes the param entirely.
 *
 * Designed to sit inline in a toolbar row beside a `<SearchBar>`; renders
 * compact side-by-side controls. Mobile wraps to stacked.
 */
export function DateRangeFilter({
  initialFrom,
  initialTo,
  fromParam = 'from',
  toParam = 'to',
}: DateRangeFilterProps) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setFrom(initialFrom)
  }, [initialFrom])
  useEffect(() => {
    setTo(initialTo)
  }, [initialTo])

  function pushBoth(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (nextFrom === '') params.delete(fromParam)
    else params.set(fromParam, nextFrom)
    if (nextTo === '') params.delete(toParam)
    else params.set(toParam, nextTo)
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  const inputCls =
    'rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-border-strong focus:outline-2 focus:outline-offset-1 focus:outline-accent disabled:opacity-50'

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={from}
        onChange={(e) => {
          const v = e.currentTarget.value
          setFrom(v)
          pushBoth(v, to)
        }}
        aria-label="From date"
        className={inputCls}
      />
      <span aria-hidden className="text-text-muted text-sm">
        →
      </span>
      <input
        type="date"
        value={to}
        onChange={(e) => {
          const v = e.currentTarget.value
          setTo(v)
          pushBoth(from, v)
        }}
        aria-label="To date"
        className={inputCls}
      />
      {from || to ? (
        <button
          type="button"
          onClick={() => {
            setFrom('')
            setTo('')
            pushBoth('', '')
          }}
          aria-label="Clear date range"
          className="rounded p-1 text-text-subtle hover:text-text disabled:opacity-50"
          disabled={pending}
          title="Clear date range"
        >
          ×
        </button>
      ) : null}
    </div>
  )
}
