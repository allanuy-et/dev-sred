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
 * URL-driven date-range filter with `from` and `to` date inputs. Push to the
 * URL on change so the server page re-fetches the filtered list. Empty value
 * removes the param entirely.
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

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="block text-xs text-text-muted mb-1">From</span>
        <input
          type="date"
          value={from}
          onChange={(e) => {
            const v = e.currentTarget.value
            setFrom(v)
            pushBoth(v, to)
          }}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-border-strong focus:outline-2 focus:outline-offset-1 focus:outline-accent"
        />
      </label>
      <label className="block">
        <span className="block text-xs text-text-muted mb-1">To</span>
        <input
          type="date"
          value={to}
          onChange={(e) => {
            const v = e.currentTarget.value
            setTo(v)
            pushBoth(from, v)
          }}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-border-strong focus:outline-2 focus:outline-offset-1 focus:outline-accent"
        />
      </label>
      {from || to ? (
        <button
          type="button"
          onClick={() => {
            setFrom('')
            setTo('')
            pushBoth('', '')
          }}
          className="text-xs text-accent hover:underline"
          disabled={pending}
        >
          Clear dates
        </button>
      ) : null}
    </div>
  )
}
