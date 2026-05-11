'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { useTransition } from 'react'

export type SortDirection = 'asc' | 'desc'

export interface SortableTHProps {
  /** The column's sort key — stored in `?sortBy=` when this column is active. */
  sortKey: string
  /** Header label. */
  children: ReactNode
  /** Cell alignment. The sort indicator flips to the same side. */
  align?: 'left' | 'right' | 'center'
  /** Currently active sort key (`?sortBy=`). */
  currentSortKey: string | null
  /** Currently active sort direction (`?sortDir=`). */
  currentSortDir: SortDirection
  /** Search-param key for the sort column. Defaults to `sortBy`. */
  paramKey?: string
  /** Search-param key for the sort direction. Defaults to `sortDir`. */
  paramDir?: string
}

/**
 * Clickable column header. Toggles asc ↔ desc when clicked on the active
 * column; sets a new column to asc when clicked. Pushes `?sortBy=` and
 * `?sortDir=` to the URL so the server page can re-render with the new sort.
 *
 * The arrow indicator uses ↑ / ↓ for the active column and a faint ↕ for
 * inactive columns to advertise sortability.
 */
export function SortableTH({
  sortKey,
  children,
  align,
  currentSortKey,
  currentSortDir,
  paramKey = 'sortBy',
  paramDir = 'sortDir',
}: SortableTHProps) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const isActive = currentSortKey === sortKey
  const nextDir: SortDirection =
    isActive && currentSortDir === 'asc' ? 'desc' : 'asc'

  function handleClick() {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set(paramKey, sortKey)
    params.set(paramDir, nextDir)
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  const alignCls =
    align === 'right'
      ? 'text-right'
      : align === 'center'
        ? 'text-center'
        : 'text-left'

  return (
    <th
      scope="col"
      aria-sort={
        isActive
          ? currentSortDir === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
      className={`px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-text-muted ${alignCls}`}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`inline-flex items-center gap-1 cursor-pointer select-none hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded-sm ${
          align === 'right' ? 'flex-row-reverse' : ''
        }`}
      >
        <span>{children}</span>
        <span
          aria-hidden
          className={`text-[10px] ${
            isActive ? 'text-text' : 'text-text-subtle'
          }`}
        >
          {isActive ? (currentSortDir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  )
}
