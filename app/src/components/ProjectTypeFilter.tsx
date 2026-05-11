'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

export type ProjectTypeFilterValue = 'all' | 'sred' | 'internal'

const OPTIONS: ReadonlyArray<{ value: ProjectTypeFilterValue; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'sred', label: 'SR&ED' },
  { value: 'internal', label: 'Internal' },
]

export interface ProjectTypeFilterProps {
  value: ProjectTypeFilterValue
  /** Search-param key. Defaults to `type`. */
  paramName?: string
}

/**
 * Inline project-type filter dropdown — same visual treatment as
 * `<StatusFilter>` so toolbar controls read as a consistent set. Pushes the
 * value to the URL; removes the param when set to the default `'all'`.
 */
export function ProjectTypeFilter({
  value,
  paramName = 'type',
}: ProjectTypeFilterProps) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.currentTarget.value as ProjectTypeFilterValue
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (next === 'all') params.delete(paramName)
    else params.set(paramName, next)
    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  return (
    <label className="inline-flex items-center gap-2 text-xs font-medium text-text-muted">
      <span aria-hidden>Type</span>
      <select
        value={value}
        onChange={handleChange}
        disabled={pending}
        aria-label="Filter by project type"
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
