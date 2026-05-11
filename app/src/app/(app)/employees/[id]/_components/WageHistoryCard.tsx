import type { User, WageHistoryEntry } from '@sred/shared'

import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { WageChangeFormDialog } from '@/components/dialogs/WageChangeFormDialog'
import { formatDate, formatRate } from '@/lib/format'

export interface WageHistoryCardProps {
  employee: User
  history: WageHistoryEntry[]
  tz: string
  locale: string
  /** Admin-only — controls visibility of the "Add wage change" trigger. */
  canManage: boolean
  /** ISO yyyy-mm-dd of "today" in caller's tz — used to mark which row is current. */
  todayIso: string
}

export function WageHistoryCard({
  employee,
  history,
  tz,
  locale,
  canManage,
  todayIso,
}: WageHistoryCardProps) {
  // The "current" row is the latest row whose effectiveDate is on or before
  // today. Anything with effectiveDate > today is a queued future change.
  const currentId = history.find((h) => h.effectiveDate <= todayIso)?.id

  return (
    <Card compact title="Wage history">
      {history.length === 0 ? (
        <p className="text-xs text-text-muted">No wage history recorded yet.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {history.map((entry) => {
            const isCurrent = entry.id === currentId
            const isFuture = entry.effectiveDate > todayIso
            return (
              <li key={entry.id} className="space-y-1 py-2 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text-muted">
                      {formatDate(entry.effectiveDate, tz, locale)}
                    </span>
                    {isCurrent ? <Badge variant="active">Current</Badge> : null}
                    {isFuture ? <Badge variant="info">Scheduled</Badge> : null}
                  </div>
                  <span className="shrink-0 tabular-nums text-xs text-text">
                    {formatRate(entry.regularRate, locale)}
                  </span>
                </div>
                <div className="text-xs text-text-muted tabular-nums">
                  Reg {formatRate(entry.regularRate, locale)} · OT{' '}
                  {formatRate(entry.overtimeRate, locale)} · Hol{' '}
                  {formatRate(entry.holidayRate, locale)}
                </div>
                {entry.note ? (
                  <p className="text-xs text-text-subtle italic">{entry.note}</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
      {canManage ? (
        <div className="mt-4 border-t border-border pt-3">
          <WageChangeFormDialog
            employeeId={employee.id}
            defaults={{
              regularRate: employee.regularRate,
              overtimeRate: employee.overtimeRate,
              holidayRate: employee.holidayRate,
            }}
          />
        </div>
      ) : null}
    </Card>
  )
}
