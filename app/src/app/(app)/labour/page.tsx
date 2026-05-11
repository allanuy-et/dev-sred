import Link from 'next/link'

import type { LabourListResponse } from '@sred/shared'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { ListLayout } from '@/components/ListLayout'
import { SearchBar } from '@/components/SearchBar'
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

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function safeIsoDate(raw: string | undefined): string {
  return typeof raw === 'string' && ISO_DATE_RE.test(raw) ? raw : ''
}

export default async function LabourListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>
}) {
  const { q: rawQ, from: rawFrom, to: rawTo } = await searchParams
  const q = typeof rawQ === 'string' ? rawQ : ''
  const from = safeIsoDate(rawFrom)
  const to = safeIsoDate(rawTo)

  const params = new URLSearchParams({ limit: '50' })
  if (q.trim().length >= 2) params.set('q', q.trim())
  if (from) params.set('from', from)
  if (to) params.set('to', to)

  const [{ entries, total }, currentUser] = await Promise.all([
    serverApi<LabourListResponse>(`/labour?${params.toString()}`),
    getCurrentUser(),
  ])

  if (!currentUser) return null
  const tz = currentUser.timezone
  const locale = getIntlLocale(currentUser.language)

  return (
    <ListLayout
      title="Labour"
      subtitle={
        <>
          {total} {total === 1 ? 'entry' : 'entries'}
          {q ? <> matching “{q}”</> : null}
          {from || to ? <> in range</> : null}
        </>
      }
      toolbar={
        <>
          <div className="flex-1 sm:max-w-md">
            <SearchBar
              initialValue={q}
              placeholder="Search notes…"
              ariaLabel="Search labour entries"
            />
          </div>
          <DateRangeFilter initialFrom={from} initialTo={to} />
          <div className="sm:ml-auto">
            <Link href="/labour/new">
              <Button>+ Add Labour</Button>
            </Link>
          </div>
        </>
      }
    >
      <Card>
        {entries.length === 0 ? (
          <EmptyTableState>
            {q || from || to
              ? <>No labour entries match these filters.</>
              : <>
                  No labour entries yet. Click <strong>+ Add Labour</strong> to
                  log your first one.
                </>}
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
    </ListLayout>
  )
}
