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

  // Open the native date picker on click anywhere in the input — same
  // behavior as the `<Field type="date">` wrapper. Browsers only expose
  // the calendar icon's tiny hit area by default; `showPicker()` widens
  // that to the whole control.
  function openPicker(e: React.MouseEvent<HTMLInputElement>) {
    const el = e.currentTarget
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker()
      } catch {
        // showPicker throws if disabled / not user-activated — ignore.
      }
    }
  }

  // When empty, hide the native `mm/dd/yyyy` placeholder via `text-transparent`
  // (the date-edit shadow fields inherit text color) and overlay a "From" /
  // "To" placeholder. Once a value is chosen, the overlay disappears and the
  // text becomes visible again.
  const emptyHideText =
    '[&:not(:focus)]:text-transparent [&:not(:focus)::-webkit-calendar-picker-indicator]:opacity-60'

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          type="date"
          value={from}
          onChange={(e) => {
            const v = e.currentTarget.value
            setFrom(v)
            pushBoth(v, to)
          }}
          onClick={openPicker}
          aria-label="From date"
          className={`${inputCls} ${from ? '' : emptyHideText}`}
        />
        {!from ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-text-subtle">
            From
          </span>
        ) : null}
      </div>
      <span aria-hidden className="text-text-muted text-sm">
        →
      </span>
      <div className="relative">
        <input
          type="date"
          value={to}
          onChange={(e) => {
            const v = e.currentTarget.value
            setTo(v)
            pushBoth(from, v)
          }}
          onClick={openPicker}
          aria-label="To date"
          className={`${inputCls} ${to ? '' : emptyHideText}`}
        />
        {!to ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-text-subtle">
            To
          </span>
        ) : null}
      </div>
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
