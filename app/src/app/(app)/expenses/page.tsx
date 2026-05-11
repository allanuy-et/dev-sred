import Link from 'next/link'

import type { ExpenseListResponse } from '@sred/shared'

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
import { EXPENSE_TYPE_LABELS } from '@/lib/expense-labels'
import { formatCurrency, formatDate } from '@/lib/format'
import { getIntlLocale } from '@/lib/i18n'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function safeIsoDate(raw: string | undefined): string {
  return typeof raw === 'string' && ISO_DATE_RE.test(raw) ? raw : ''
}

export default async function ExpensesListPage({
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
    serverApi<ExpenseListResponse>(`/expenses?${params.toString()}`),
    getCurrentUser(),
  ])

  if (!currentUser) return null
  const tz = currentUser.timezone
  const locale = getIntlLocale(currentUser.language)

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
      filters={
        <div className="space-y-5">
          <FilterGroup label="Date range">
            <DateRangeFilter initialFrom={from} initialTo={to} />
          </FilterGroup>
        </div>
      }
      toolbar={
        <>
          <div className="w-full sm:max-w-md">
            <SearchBar
              initialValue={q}
              placeholder="Search notes or PO number…"
              ariaLabel="Search expenses"
            />
          </div>
          <Link href="/expenses/new">
            <Button>+ Add Expense</Button>
          </Link>
        </>
      }
    >
      <Card>
        {entries.length === 0 ? (
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
                <TH>Date</TH>
                <TH>Employee</TH>
                <TH>Project</TH>
                <TH>Type</TH>
                <TH align="right">Cost</TH>
              </TR>
            </THead>
            <TBody>
              {entries.map((entry) => (
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

function FilterGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </p>
      {children}
    </div>
  )
}
