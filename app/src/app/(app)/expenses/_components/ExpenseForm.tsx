'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type {
  Attachment,
  AttachmentListResponse,
  CreateExpenseInput,
  Expense,
  ExpenseEvidence,
  ExpenseType,
} from '@sred/shared'

import { AttachmentsField } from '@/components/AttachmentsField'
import { Button } from '@/components/Button'
import { EmployeePicker } from '@/components/EmployeePicker'
import { Field, SelectField, TextAreaField } from '@/components/Field'
import { ApiError, getServerErrorMessage } from '@/lib/api'
import { clientApi, uploadFiles } from '@/lib/api.client'
import {
  EXPENSE_EVIDENCES,
  EXPENSE_EVIDENCE_LABELS,
  EXPENSE_TYPES,
  EXPENSE_TYPE_LABELS,
} from '@/lib/expense-labels'

import type { EmployeeOption } from '../../labour/_lib/selectOptions'

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
  employees: EmployeeOption[]
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
  /**
   * When set, the employee picker is locked to this id — used for standard
   * users who can only record expenses for themselves.
   */
  lockedToEmployeeId?: string
  /** Existing attachments — passed in edit mode for the file manager UI. */
  attachments?: Attachment[]
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
  lockedToEmployeeId,
  attachments = [],
}: ExpenseFormProps) {
  const router = useRouter()
  const [state, setState] = useState<ExpenseFormInitial>(initial)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([])

  function update<K extends keyof ExpenseFormInitial>(
    key: K,
    value: ExpenseFormInitial[K],
  ) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!state.date) {
      setError('Please choose a date.')
      return
    }
    const costNumber =
      typeof state.cost === 'number' ? state.cost : Number(state.cost)
    // Mirrors the API: `cost` must be a number >= 0.
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
      employeeId: lockedToEmployeeId ?? state.employeeId,
      projectId: state.projectId,
      cost: costNumber,
      poNumber: trimmedPo === '' ? null : trimmedPo,
      type: state.type,
      objectiveEvidence: state.objectiveEvidence,
      notes: trimmedNotes === '' ? null : trimmedNotes,
    }

    setSubmitting(true)
    try {
      let recordId: string
      if (mode === 'create') {
        const created = await clientApi<{ entry: Expense }>('/expenses', {
          method: 'POST',
          body,
        })
        recordId = created.entry.id
      } else {
        if (!entryId) throw new Error('Missing entry id for edit')
        await clientApi<{ entry: Expense }>(`/expenses/${entryId}`, {
          method: 'PATCH',
          body,
        })
        recordId = entryId
      }

      // Reconcile attachments: delete first, then upload new files.
      const dels = removedAttachmentIds.map((aid) =>
        clientApi<{ ok: boolean }>(
          `/expenses/${recordId}/attachments/${aid}`,
          { method: 'DELETE' },
        ),
      )
      await Promise.all(dels)
      if (pendingFiles.length > 0) {
        await uploadFiles<AttachmentListResponse>(
          `/expenses/${recordId}/attachments`,
          pendingFiles,
        )
      }
      setPendingFiles([])
      setRemovedAttachmentIds([])

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(onSuccessHref)
        router.refresh()
      }
      setSubmitting(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Please sign in again.')
      } else {
        setError(
          getServerErrorMessage(
            err,
            'Could not save the expense. Please try again.',
          ),
        )
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

        <EmployeePicker
          label="Employee"
          required
          value={lockedToEmployeeId ?? state.employeeId}
          onChange={(id) => update('employeeId', id)}
          options={employees}
          locked={Boolean(lockedToEmployeeId)}
          helper={
            lockedToEmployeeId
              ? 'Standard users can only record expenses for themselves.'
              : undefined
          }
        />

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

      <AttachmentsField
        parentKind="expense"
        parentId={entryId}
        existing={attachments}
        pendingFiles={pendingFiles}
        removedIds={removedAttachmentIds}
        onAddFiles={(files) => setPendingFiles((prev) => [...prev, ...files])}
        onRemoveExisting={(id) =>
          setRemovedAttachmentIds((prev) =>
            prev.includes(id) ? prev : [...prev, id],
          )
        }
        onUndoRemoveExisting={(id) =>
          setRemovedAttachmentIds((prev) => prev.filter((x) => x !== id))
        }
        onRemovePending={(idx) =>
          setPendingFiles((prev) => prev.filter((_, i) => i !== idx))
        }
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
