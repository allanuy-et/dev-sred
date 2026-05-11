'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

import type { StatusFilterValue } from '@/lib/status-filter'

export type { StatusFilterValue }

const OPTIONS: ReadonlyArray<{ value: StatusFilterValue; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'all', label: 'All' },
]

export interface StatusFilterProps {
  /** Current value (typically read from the URL on the server). */
  value: StatusFilterValue
  /** The search-param key to write. Defaults to `status`. */
  paramName?: string
  /** Label shown to assistive tech. */
  label?: string
}

/**
 * Query-param-driven status filter dropdown. Pushes to the current pathname
 * with the new `status` value; falls back to removing the param when set to
 * the default ('active'), to keep URLs clean.
 */
export function StatusFilter({
  value,
  paramName = 'status',
  label = 'Filter by status',
}: StatusFilterProps) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.currentTarget.value as StatusFilterValue
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (next === 'active') {
      params.delete(paramName)
    } else {
      params.set(paramName, next)
    }
    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  return (
    <label className="inline-flex items-center gap-2 text-xs font-medium text-text-muted">
      <span className="sr-only">{label}</span>
      <span aria-hidden>Show</span>
      <select
        value={value}
        onChange={handleChange}
        disabled={pending}
        aria-label={label}
        className="appearance-none rounded-md border border-border bg-surface bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat py-1 pl-2 pr-7 text-xs text-text focus:border-border-strong focus:outline-2 focus:outline-offset-1 focus:outline-accent disabled:opacity-50"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%2378716c' stroke-width='1.5'><path d='M6 8l4 4 4-4'/></svg>\")",
        }}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

