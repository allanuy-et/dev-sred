'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { ExpenseWithRelations } from '@sred/shared'

import { Button } from '@/components/Button'
import { ApiError } from '@/lib/api'
import { clientApi } from '@/lib/api.client'
import {
  EXPENSE_EVIDENCE_LABELS,
  EXPENSE_TYPE_LABELS,
} from '@/lib/expense-labels'
import { formatCurrency, formatDate } from '@/lib/format'

import type { SelectOption } from '../../../labour/_lib/selectOptions'
import {
  ExpenseForm,
  type ExpenseFormInitial,
} from '../../_components/ExpenseForm'

export interface ExpenseDetailProps {
  entry: ExpenseWithRelations
  employees: SelectOption[]
  projects: SelectOption[]
}

export function ExpenseDetail({
  entry,
  employees,
  projects,
}: ExpenseDetailProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!window.confirm('Delete this expense? This cannot be undone.')) {
      return
    }
    setError(null)
    setDeleting(true)
    try {
      await clientApi<{ ok: boolean }>(`/expenses/${entry.id}`, {
        method: 'DELETE',
      })
      router.push('/expenses')
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Please sign in again.')
      } else {
        setError('Could not delete the expense. Please try again.')
      }
      setDeleting(false)
    }
  }

  if (editing) {
    const initial: ExpenseFormInitial = {
      date: entry.date.slice(0, 10),
      employeeId: entry.employeeId,
      projectId: entry.projectId,
      cost: entry.cost,
      poNumber: entry.poNumber ?? '',
      type: entry.type,
      objectiveEvidence: entry.objectiveEvidence,
      notes: entry.notes ?? '',
    }
    return (
      <ExpenseForm
        mode="edit"
        entryId={entry.id}
        initial={initial}
        employees={employees}
        projects={projects}
        onSuccessHref={`/expenses/${entry.id}`}
        onCancelHref={`/expenses/${entry.id}`}
      />
    )
  }

  return (
    <div className="space-y-8">
      <dl className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
        <DescriptionItem label="Date" value={formatDate(entry.date)} />
        <DescriptionItem
          label="Cost"
          value={
            <span className="tabular-nums">{formatCurrency(entry.cost)}</span>
          }
        />
        <DescriptionItem label="Employee" value={entry.employeeName} />
        <DescriptionItem label="Project" value={entry.projectName} />
        <DescriptionItem
          label="PO Number"
          value={entry.poNumber ?? '—'}
        />
        <DescriptionItem
          label="Type"
          value={EXPENSE_TYPE_LABELS[entry.type]}
        />
        <DescriptionItem
          label="Objective Evidence"
          value={EXPENSE_EVIDENCE_LABELS[entry.objectiveEvidence]}
          className="sm:col-span-2"
        />
        <DescriptionItem
          label="Notes"
          value={entry.notes ?? '—'}
          className="sm:col-span-2"
        />
      </dl>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
        <Button onClick={() => setEditing(true)}>Edit</Button>
      </div>
    </div>
  )
}

function DescriptionItem({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-text">{value}</dd>
    </div>
  )
}
