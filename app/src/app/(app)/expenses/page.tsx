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
  Table,
} from '@/components/Table'
import { serverApi } from '@/lib/api.server'
import { EXPENSE_TYPE_LABELS } from '@/lib/expense-labels'
import { formatCurrency, formatDate } from '@/lib/format'

export default async function ExpensesListPage() {
  const { entries, total } = await serverApi<ExpenseListResponse>(
    '/expenses?limit=50',
  )

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="text-sm text-text-muted">
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
                <TH align="right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {entries.map((entry) => (
                <TR key={entry.id} interactive>
                  <TD>{formatDate(entry.date)}</TD>
                  <TD>{entry.employeeName}</TD>
                  <TD>{entry.projectName}</TD>
                  <TD>{EXPENSE_TYPE_LABELS[entry.type]}</TD>
                  <TD align="right" className="tabular-nums">
                    {formatCurrency(entry.cost)}
                  </TD>
                  <TD align="right">
                    <Link
                      href={`/expenses/${entry.id}`}
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
