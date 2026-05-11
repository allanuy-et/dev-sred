import Link from 'next/link'

import type { ExpenseListResponse } from '@sred/shared'

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
import { EXPENSE_TYPE_LABELS } from '@/lib/expense-labels'
import { formatCurrency, formatDate } from '@/lib/format'
import { getIntlLocale } from '@/lib/i18n'

export default async function ExpensesListPage() {
  const [{ entries, total }, currentUser] = await Promise.all([
    serverApi<ExpenseListResponse>('/expenses?limit=50'),
    getCurrentUser(),
  ])

  if (!currentUser) return null
  const tz = currentUser.timezone
  const locale = getIntlLocale(currentUser.language)

  return (
    <div className="space-y-12">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Expenses</h1>
          <p className="mt-2 text-sm text-text-muted">
            {total} {total === 1 ? 'entry' : 'entries'} recorded.
          </p>
        </div>
        <Link href="/expenses/new">
          <Button>+ Add Expense</Button>
        </Link>
      </header>

      <Card>
        {entries.length === 0 ? (
          <EmptyTableState>
            No expenses yet. Click <strong>Add Expense</strong> to log your
            first one.
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
    </div>
  )
}
