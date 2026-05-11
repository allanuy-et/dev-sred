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
  Table,
} from '@/components/Table'
import { serverApi } from '@/lib/api.server'
import { formatDate, formatHours } from '@/lib/format'
import { LABOUR_TYPE_LABELS } from '@/lib/labour-labels'

export default async function LabourListPage() {
  const { entries, total } = await serverApi<LabourListResponse>(
    '/labour?limit=50',
  )

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Labour</h1>
          <p className="text-sm text-text-muted">
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
                <TH align="right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {entries.map((entry) => (
                <TR key={entry.id} interactive>
                  <TD>{formatDate(entry.date)}</TD>
                  <TD>{entry.employeeName}</TD>
                  <TD>{entry.projectName}</TD>
                  <TD>{LABOUR_TYPE_LABELS[entry.labourType]}</TD>
                  <TD align="right" className="tabular-nums">
                    {formatHours(entry.hours)}
                  </TD>
                  <TD align="right">
                    <Link
                      href={`/labour/${entry.id}`}
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      View
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
