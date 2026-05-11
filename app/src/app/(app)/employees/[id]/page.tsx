import Link from 'next/link'
import { notFound } from 'next/navigation'

import type {
  ExpenseListResponse,
  ExpenseWithRelations,
  LabourEntryWithRelations,
  LabourListResponse,
  User,
  EmployeeResponse,
} from '@sred/shared'

import { Card } from '@/components/Card'
import { ApiError } from '@/lib/api'
import { serverApi } from '@/lib/api.server'
import { LABOUR_TYPE_LABELS } from '@/lib/labour-labels'
import { EXPENSE_TYPE_LABELS } from '@/lib/expense-labels'
import { formatCurrency, formatDate, formatHours } from '@/lib/format'

import { EmployeeDetail } from './_components/EmployeeDetail'

const RECENT_LIMIT = 10

async function loadEmployee(id: string): Promise<User | null> {
  try {
    const { employee } = await serverApi<EmployeeResponse>(`/employees/${id}`)
    return employee
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

// Safe fetch — an aside-list failure shouldn't break the whole detail page.
async function loadRecentLabour(
  employeeId: string,
): Promise<LabourEntryWithRelations[]> {
  try {
    const { entries } = await serverApi<LabourListResponse>(
      `/labour?employeeId=${employeeId}&limit=${RECENT_LIMIT}`,
    )
    return entries
  } catch {
    return []
  }
}

async function loadRecentExpenses(
  employeeId: string,
): Promise<ExpenseWithRelations[]> {
  try {
    const { entries } = await serverApi<ExpenseListResponse>(
      `/expenses?employeeId=${employeeId}&limit=${RECENT_LIMIT}`,
    )
    return entries
  } catch {
    return []
  }
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const employee = await loadEmployee(id)

  if (!employee) notFound()

  const [labour, expenses] = await Promise.all([
    loadRecentLabour(employee.id),
    loadRecentExpenses(employee.id),
  ])

  const aside = (
    <>
      <RecentLabourCard
        employeeId={employee.id}
        entries={labour}
      />
      <RecentExpensesCard
        employeeId={employee.id}
        entries={expenses}
      />
    </>
  )

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="mt-1 text-sm text-text-muted">{employee.email}</p>
        </div>
        <Link
          href="/employees"
          className="text-sm font-medium text-text-muted hover:text-text"
        >
          ← Back to employees
        </Link>
      </header>

      <EmployeeDetail employee={employee} aside={aside} />
    </div>
  )
}

function RecentLabourCard({
  employeeId,
  entries,
}: {
  employeeId: string
  entries: LabourEntryWithRelations[]
}) {
  return (
    <Card
      compact
      title="Recent labour"
      actions={
        <Link
          href={`/labour?employeeId=${employeeId}`}
          className="text-xs font-medium text-accent hover:underline"
        >
          View all
        </Link>
      }
    >
      {entries.length === 0 ? (
        <p className="text-xs text-text-muted">No labour entries yet.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
            >
              <Link
                href={`/labour/${entry.id}`}
                className="min-w-0 flex-1 hover:underline"
              >
                <div className="text-xs font-medium text-text-muted">
                  {formatDate(entry.date)}
                </div>
                <div className="truncate text-sm text-text">
                  {entry.projectName}
                </div>
                <div className="text-xs text-text-muted">
                  {LABOUR_TYPE_LABELS[entry.labourType]}
                </div>
              </Link>
              <span className="shrink-0 text-sm tabular-nums text-text">
                {formatHours(entry.hours)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function RecentExpensesCard({
  employeeId,
  entries,
}: {
  employeeId: string
  entries: ExpenseWithRelations[]
}) {
  return (
    <Card
      compact
      title="Recent expenses"
      actions={
        <Link
          href={`/expenses?employeeId=${employeeId}`}
          className="text-xs font-medium text-accent hover:underline"
        >
          View all
        </Link>
      }
    >
      {entries.length === 0 ? (
        <p className="text-xs text-text-muted">No expenses yet.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
            >
              <Link
                href={`/expenses/${entry.id}`}
                className="min-w-0 flex-1 hover:underline"
              >
                <div className="text-xs font-medium text-text-muted">
                  {formatDate(entry.date)}
                </div>
                <div className="truncate text-sm text-text">
                  {entry.projectName}
                </div>
                <div className="text-xs text-text-muted">
                  {EXPENSE_TYPE_LABELS[entry.type]}
                </div>
              </Link>
              <span className="shrink-0 text-sm tabular-nums text-text">
                {formatCurrency(entry.cost)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
