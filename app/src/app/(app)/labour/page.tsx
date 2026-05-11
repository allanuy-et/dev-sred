import Link from 'next/link'

import type { LabourListResponse } from '@sred/shared'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import {
  EmptyTableState,
  TBody,
  TD,
  TH,
  THead,
  TR,
  TRLink,
  Table,
} from '@/components/Table'
import { serverApi } from '@/lib/api.server'
import { getCurrentUser } from '@/lib/auth.server'
import { formatDate, formatHours } from '@/lib/format'
import { getIntlLocale } from '@/lib/i18n'
import { LABOUR_TYPE_LABELS } from '@/lib/labour-labels'

export default async function LabourListPage() {
  const [{ entries, total }, currentUser] = await Promise.all([
    serverApi<LabourListResponse>('/labour?limit=50'),
    getCurrentUser(),
  ])

  if (!currentUser) return null
  const tz = currentUser.timezone
  const locale = getIntlLocale(currentUser.language)

  return (
    <div className="space-y-12">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Labour</h1>
          <p className="mt-2 text-sm text-text-muted">
            {total} {total === 1 ? 'entry' : 'entries'} recorded.
          </p>
        </div>
        <Link href="/labour/new">
          <Button>+ Add Labour</Button>
        </Link>
      </header>

      <Card>
        {entries.length === 0 ? (
          <EmptyTableState>
            No labour entries yet. Click <strong>Add Labour</strong> to log
            your first one.
          </EmptyTableState>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Employee</TH>
                <TH>Project</TH>
                <TH>Type</TH>
                <TH align="right">Hours</TH>
              </TR>
            </THead>
            <TBody>
              {entries.map((entry) => (
                <TRLink
                  key={entry.id}
                  href={`/labour/${entry.id}`}
                  accessibleLabel={`View labour entry ${formatDate(entry.date, tz, locale)} — ${entry.employeeName} — ${formatHours(entry.hours, locale)}`}
                >
                  <TD>
                    <Link
                      href={`/labour/${entry.id}`}
                      className="font-medium text-text hover:underline"
                    >
                      {formatDate(entry.date, tz, locale)}
                    </Link>
                  </TD>
                  <TD>{entry.employeeName}</TD>
                  <TD>{entry.projectName}</TD>
                  <TD>{LABOUR_TYPE_LABELS[entry.labourType]}</TD>
                  <TD align="right" className="tabular-nums">
                    {formatHours(entry.hours, locale)}
                  </TD>
                </TRLink>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
