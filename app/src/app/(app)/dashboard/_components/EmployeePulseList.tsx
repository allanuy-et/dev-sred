import Link from 'next/link'

import type { EmployeePulseRow } from '@sred/shared'

import { EmployeeAvatar } from '@/components/EmployeeAvatar'
import { formatHours } from '@/lib/format'

export interface EmployeePulseListProps {
  rows: EmployeePulseRow[]
  /** Total team hours this week — used for the per-employee share bar. */
  totalHours: number
  locale: string
}

export function EmployeePulseList({
  rows,
  totalHours,
  locale,
}: EmployeePulseListProps) {
  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-text-muted">
        No employees logged time this week.
      </div>
    )
  }

  // Same scale heuristic as the project pulse list — keep proportions intuitive
  // when only one person logged time.
  const maxHours = Math.max(rows[0]?.hours ?? 0, totalHours * 0.4)

  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => {
        const pct =
          maxHours === 0 ? 0 : Math.min(100, (row.hours / maxHours) * 100)
        return (
          <li key={row.employeeId}>
            <Link
              href={`/employees/${row.employeeId}`}
              className="block rounded-md px-2 py-3 -mx-2 hover:bg-surface-hover focus:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <EmployeeAvatar employee={row} size="sm" />
                  <span className="truncate font-medium text-text">
                    {row.firstName} {row.lastName}
                  </span>
                </div>
                <span className="tabular-nums text-sm text-text-muted whitespace-nowrap">
                  {formatHours(row.hours, locale)}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-surface-hover overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
