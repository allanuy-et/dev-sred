'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type {
  CreateExpenseInput,
  Expense,
  ExpenseEvidence,
  ExpenseType,
} from '@sred/shared'

import { Button } from '@/components/Button'
import { Field, SelectField, TextAreaField } from '@/components/Field'
import { ApiError } from '@/lib/api'
import { clientApi } from '@/lib/api.client'
import {
  EXPENSE_EVIDENCES,
  EXPENSE_EVIDENCE_LABELS,
  EXPENSE_TYPES,
  EXPENSE_TYPE_LABELS,
} from '@/lib/expense-labels'

interface SelectOption {
  id: string
  label: string
}

export interface ExpenseFormInitial {
  date: string
  employeeId: string
  projectId: string
  cost: number | ''
  poNumber: string
  type: ExpenseType
  objectiveEvidence: ExpenseEvidence
  notes: string
}

export interface ExpenseFormProps {
  mode: 'create' | 'edit'
  initial: ExpenseFormInitial
  employees: SelectOption[]
  projects: SelectOption[]
  /** Required for `edit` mode. */
  entryId?: string
  /**
   * Where to navigate on a successful save. Ignored when `onSuccess` is
   * provided. Defaults to `/expenses`.
   */
  onSuccessHref?: string
  /** Optional secondary action (e.g. cancel back to detail). */
  onCancelHref?: string
  /**
   * Callback fired after a successful save. When provided, the form does
   * NOT navigate; the caller is responsible for closing a modal /
   * refreshing the page / etc.
   */
  onSuccess?: () => void
  /**
   * Callback fired when the user clicks Cancel. When provided, the form
   * does NOT navigate; the caller decides what "cancel" means.
   */
  onCancel?: () => void
}

// POST/PATCH body matches the shared `CreateExpenseInput` shape; PATCH on the
// backend accepts a partial, so sending a full body is also valid there.

export function ExpenseForm({
  mode,
  initial,
  employees,
  projects,
  entryId,
  onSuccessHref = '/expenses',
  onCancelHref,
  onSuccess,
  onCancel,
}: ExpenseFormProps) {
  const router = useRouter()
  const [state, setState] = useState<ExpenseFormInitial>(initial)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof ExpenseFormInitial>(
    key: K,
    value: ExpenseFormInitial[K],
  ) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const costNumber =
      typeof state.cost === 'number' ? state.cost : Number(state.cost)
    if (!Number.isFinite(costNumber) || costNumber < 0) {
      setError('Cost must be a non-negative number.')
      return
    }
    if (!state.employeeId) {
      setError('Please choose an employee.')
      return
    }
    if (!state.projectId) {
      setError('Please choose a project.')
      return
    }

    const trimmedPo = state.poNumber.trim()
    const trimmedNotes = state.notes.trim()

    const body: CreateExpenseInput = {
      date: state.date,
      employeeId: state.employeeId,
      projectId: state.projectId,
      cost: costNumber,
      poNumber: trimmedPo === '' ? null : trimmedPo,
      type: state.type,
      objectiveEvidence: state.objectiveEvidence,
      notes: trimmedNotes === '' ? null : trimmedNotes,
    }

    setSubmitting(true)
    try {
      if (mode === 'create') {
        await clientApi<{ entry: Expense }>('/expenses', {
          method: 'POST',
          body,
        })
      } else {
        if (!entryId) throw new Error('Missing entry id for edit')
        await clientApi<{ entry: Expense }>(`/expenses/${entryId}`, {
          method: 'PATCH',
          body,
        })
      }
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(onSuccessHref)
        router.refresh()
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Please sign in again.')
      } else if (err instanceof ApiError && err.status === 400) {
        setError('Please double-check the entry — something looked off.')
      } else {
        setError('Could not save the expense. Please try again.')
      }
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Date"
          type="date"
          required
          value={state.date}
          onChange={(e) => update('date', e.currentTarget.value)}
        />
        <Field
          label="Cost"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          required
          value={state.cost === '' ? '' : String(state.cost)}
          onChange={(e) => {
            const v = e.currentTarget.value
            update('cost', v === '' ? '' : Number(v))
          }}
        />

        <SelectField
          label="Employee"
          required
          value={state.employeeId}
          onChange={(e) => update('employeeId', e.currentTarget.value)}
        >
          <option value="" disabled>
            Select an employee…
          </option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Project"
          required
          value={state.projectId}
          onChange={(e) => update('projectId', e.currentTarget.value)}
        >
          <option value="" disabled>
            Select a project…
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </SelectField>

        <Field
          label="PO Number"
          helper="Optional"
          value={state.poNumber}
          onChange={(e) => update('poNumber', e.currentTarget.value)}
        />

        <SelectField
          label="Type"
          value={state.type}
          onChange={(e) => update('type', e.currentTarget.value as ExpenseType)}
        >
          {EXPENSE_TYPES.map((v) => (
            <option key={v} value={v}>
              {EXPENSE_TYPE_LABELS[v]}
            </option>
          ))}
        </SelectField>

        <SelectField
          className="sm:col-span-2"
          label="Objective Evidence"
          value={state.objectiveEvidence}
          onChange={(e) =>
            update(
              'objectiveEvidence',
              e.currentTarget.value as ExpenseEvidence,
            )
          }
        >
          {EXPENSE_EVIDENCES.map((v) => (
            <option key={v} value={v}>
              {EXPENSE_EVIDENCE_LABELS[v]}
            </option>
          ))}
        </SelectField>
      </div>

      <TextAreaField
        label="Notes"
        value={state.notes}
        onChange={(e) => update('notes', e.currentTarget.value)}
        rows={3}
      />

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        {onCancel || onCancelHref ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (onCancel) onCancel()
              else if (onCancelHref) router.push(onCancelHref)
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting
            ? 'Saving…'
            : mode === 'create'
              ? 'Create expense'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
