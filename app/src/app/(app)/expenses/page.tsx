import Link from 'next/link'

import type { ExpenseListResponse, ExpenseWithRelations } from '@sred/shared'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { ListLayout } from '@/components/ListLayout'
import { SearchBar } from '@/components/SearchBar'
import { SortableTH, type SortDirection } from '@/components/SortableTH'
import {
  EmptyTableState,
  TBody,
  TD,
  THead,
  TR,
  TRLink,
  Table,
} from '@/components/Table'
import { serverApi } from '@/lib/api.server'
import { getCurrentUser } from '@/lib/auth.server'
import { EXPENSE_TYPE_LABELS } from '@/lib/expense-labels'
import { formatCurrency, formatDate } from '@/lib/format'
import { getIntlLocale } from '@/lib/i18n'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function safeIsoDate(raw: string | undefined): string {
  return typeof raw === 'string' && ISO_DATE_RE.test(raw) ? raw : ''
}

type SortKey = 'date' | 'employee' | 'project' | 'type' | 'cost'

function parseSortKey(raw: string | undefined): SortKey | null {
  if (
    raw === 'date' ||
    raw === 'employee' ||
    raw === 'project' ||
    raw === 'type' ||
    raw === 'cost'
  ) {
    return raw
  }
  return null
}

function parseSortDir(raw: string | undefined): SortDirection {
  return raw === 'desc' ? 'desc' : 'asc'
}

const COMPARATORS: Record<
  SortKey,
  (a: ExpenseWithRelations, b: ExpenseWithRelations) => number
> = {
  date: (a, b) => a.date.localeCompare(b.date),
  employee: (a, b) => a.employeeName.localeCompare(b.employeeName),
  project: (a, b) => a.projectName.localeCompare(b.projectName),
  type: (a, b) => a.type.localeCompare(b.type),
  cost: (a, b) => a.cost - b.cost,
}

export default async function ExpensesListPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    from?: string
    to?: string
    sortBy?: string
    sortDir?: string
  }>
}) {
  const {
    q: rawQ,
    from: rawFrom,
    to: rawTo,
    sortBy: rawSortBy,
    sortDir: rawSortDir,
  } = await searchParams
  const q = typeof rawQ === 'string' ? rawQ : ''
  const from = safeIsoDate(rawFrom)
  const to = safeIsoDate(rawTo)
  const sortBy = parseSortKey(rawSortBy)
  const sortDir = parseSortDir(rawSortDir)

  const params = new URLSearchParams({ limit: '50' })
  if (q.trim().length >= 2) params.set('q', q.trim())
  if (from) params.set('from', from)
  if (to) params.set('to', to)

  const [{ entries, total }, currentUser] = await Promise.all([
    serverApi<ExpenseListResponse>(`/expenses?${params.toString()}`),
    getCurrentUser(),
  ])

  if (!currentUser) return null
  const tz = currentUser.timezone
  const locale = getIntlLocale(currentUser.language)

  const sortedEntries = sortBy
    ? [...entries].sort(
        (a, b) => COMPARATORS[sortBy](a, b) * (sortDir === 'desc' ? -1 : 1),
      )
    : entries

  return (
    <ListLayout
      title="Expenses"
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
              placeholder="Search notes or PO number…"
              ariaLabel="Search expenses"
            />
          </div>
          <DateRangeFilter initialFrom={from} initialTo={to} />
          <div className="sm:ml-auto">
            <Link href="/expenses/new">
              <Button>+ Add Expense</Button>
            </Link>
          </div>
        </>
      }
    >
      <Card>
        {sortedEntries.length === 0 ? (
          <EmptyTableState>
            {q || from || to
              ? <>No expenses match these filters.</>
              : <>
                  No expenses yet. Click <strong>+ Add Expense</strong> to log
                  your first one.
                </>}
          </EmptyTableState>
        ) : (
          <Table>
            <THead>
              <TR>
                <SortableTH sortKey="date" currentSortKey={sortBy} currentSortDir={sortDir}>
                  Date
                </SortableTH>
                <SortableTH sortKey="employee" currentSortKey={sortBy} currentSortDir={sortDir}>
                  Employee
                </SortableTH>
                <SortableTH sortKey="project" currentSortKey={sortBy} currentSortDir={sortDir}>
                  Project
                </SortableTH>
                <SortableTH sortKey="type" currentSortKey={sortBy} currentSortDir={sortDir}>
                  Type
                </SortableTH>
                <SortableTH
                  sortKey="cost"
                  currentSortKey={sortBy}
                  currentSortDir={sortDir}
                  align="right"
                >
                  Cost
                </SortableTH>
              </TR>
            </THead>
            <TBody>
              {sortedEntries.map((entry) => (
                <TRLink
                  key={entry.id}
                  href={`/expenses/${entry.id}`}
                  accessibleLabel={`View expense ${formatDate(entry.date, tz, locale)} — ${entry.employeeName} — ${formatCurrency(entry.cost, locale)}`}
                >
                  <TD>
                    <Link
                      href={`/expenses/${entry.id}`}
                      className="font-medium text-text hover:underline"
                    >
                      {formatDate(entry.date, tz, locale)}
                    </Link>
                  </TD>
                  <TD>{entry.employeeName}</TD>
                  <TD>{entry.projectName}</TD>
                  <TD>{EXPENSE_TYPE_LABELS[entry.type]}</TD>
                  <TD align="right" className="tabular-nums">
                    {formatCurrency(entry.cost, locale)}
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
