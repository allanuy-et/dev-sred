import Link from 'next/link'

import type { ProjectPulseRow } from '@sred/shared'

import { Badge } from '@/components/Badge'
import { formatHours } from '@/lib/format'

export interface ProjectPulseListProps {
  rows: ProjectPulseRow[]
  /** Total team hours this week — used for the per-project share bar. */
  totalHours: number
  locale: string
}

export function ProjectPulseList({
  rows,
  totalHours,
  locale,
}: ProjectPulseListProps) {
  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-text-muted">
        No projects active this week.
      </div>
    )
  }

  // Top project sets the bar baseline so a single-project week still shows
  // a visible bar; if we used totalHours, the top bar would always be 100%
  // which is visually fine, but a quiet week looks deflated. Use whichever
  // is larger to keep proportions intuitive.
  const maxHours = Math.max(rows[0]?.hours ?? 0, totalHours * 0.4)

  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => {
        const pct = maxHours === 0 ? 0 : Math.min(100, (row.hours / maxHours) * 100)
        return (
          <li key={row.projectId}>
            <Link
              href={`/projects/${row.projectId}`}
              className="block rounded-md px-2 py-3 -mx-2 hover:bg-surface-hover focus:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate font-medium text-text">
                    {row.projectName}
                  </span>
                  {row.projectType === 'sred' ? (
                    <Badge variant="info">SR&amp;ED</Badge>
                  ) : null}
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
