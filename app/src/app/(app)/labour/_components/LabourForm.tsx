'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type {
  Attachment,
  AttachmentListResponse,
  BulkCreateLabourInput,
  BulkCreateLabourResponse,
  CreateLabourInput,
  LabourEntry,
  LabourTime,
  LabourType,
  ObjectiveEvidence,
} from '@sred/shared'

import { AttachmentsField } from '@/components/AttachmentsField'
import { Button } from '@/components/Button'
import { EmployeePicker } from '@/components/EmployeePicker'
import { Field, SelectField, TextAreaField } from '@/components/Field'
import { ApiError, getServerErrorMessage } from '@/lib/api'
import { clientApi, uploadFiles } from '@/lib/api.client'
import {
  LABOUR_TIMES,
  LABOUR_TIME_LABELS,
  LABOUR_TYPES,
  LABOUR_TYPE_LABELS,
  OBJECTIVE_EVIDENCES,
  OBJECTIVE_EVIDENCE_LABELS,
} from '@/lib/labour-labels'

import type { EmployeeOption } from '../_lib/selectOptions'

interface SelectOption {
  id: string
  label: string
}

export interface LabourFormInitial {
  date: string
  employeeId: string
  projectId: string
  hours: number | ''
  labourTime: LabourTime
  labourType: LabourType
  objectiveEvidence: ObjectiveEvidence
  notes: string
}

export interface LabourFormProps {
  mode: 'create' | 'edit'
  initial: LabourFormInitial
  employees: EmployeeOption[]
  projects: SelectOption[]
  /** Required for `edit` mode. */
  entryId?: string
  /**
   * Where to navigate on a successful save. Ignored when `onSuccess` is
   * provided. Defaults to `/labour`.
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
   * users who can only log labour for themselves. Backend enforces the same.
   */
  lockedToEmployeeId?: string
  /** Existing attachments — passed in edit mode so the form can show + manage them. */
  attachments?: Attachment[]
}

// The POST/PATCH body matches the shared `CreateLabourInput` shape exactly.
// PATCH on the backend accepts a partial, so a full body is also valid there.

export function LabourForm({
  mode,
  initial,
  employees,
  projects,
  entryId,
  onSuccessHref = '/labour',
  onCancelHref,
  onSuccess,
  onCancel,
  lockedToEmployeeId,
  attachments = [],
}: LabourFormProps) {
  const router = useRouter()
  const [state, setState] = useState<LabourFormInitial>(initial)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Multi-day mode is `create`-only — there's no concept of "edit a range".
  // Toggling it swaps the single Date field for a from/to range + skip-weekends.
  const [bulkMode, setBulkMode] = useState(false)
  const [endDate, setEndDate] = useState<string>(initial.date)
  const [skipWeekends, setSkipWeekends] = useState(true)
  // Attachments state — staged client-side and reconciled with the server on save.
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([])

  function update<K extends keyof LabourFormInitial>(
    key: K,
    value: LabourFormInitial[K],
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
    const hoursNumber =
      typeof state.hours === 'number' ? state.hours : Number(state.hours)
    // Mirrors the API: `hours` must be a number > 0 and <= 24.
    if (!Number.isFinite(hoursNumber) || hoursNumber <= 0) {
      setError('Hours must be a positive number.')
      return
    }
    if (hoursNumber > 24) {
      setError('Hours cannot exceed 24 per entry.')
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

    // Multi-day path: validate range bounds, then POST to /labour/bulk.
    if (mode === 'create' && bulkMode) {
      if (!endDate) {
        setError('Please choose an end date.')
        return
      }
      if (endDate < state.date) {
        setError('End date must be on or after the start date.')
        return
      }
      const bulkBody: BulkCreateLabourInput = {
        employeeId: lockedToEmployeeId ?? state.employeeId,
        projectId: state.projectId,
        startDate: state.date,
        endDate,
        hours: hoursNumber,
        labourTime: state.labourTime,
        labourType: state.labourType,
        objectiveEvidence: state.objectiveEvidence,
        notes: state.notes.trim() === '' ? null : state.notes.trim(),
        skipWeekends,
      }
      setSubmitting(true)
      try {
        await clientApi<BulkCreateLabourResponse>('/labour/bulk', {
          method: 'POST',
          body: bulkBody,
        })
        if (onSuccess) {
          onSuccess()
        } else {
          router.push(onSuccessHref)
          router.refresh()
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setError('Your session expired. Please sign in again.')
        } else {
          setError(
            getServerErrorMessage(
              err,
              'Could not create the labour entries. Please try again.',
            ),
          )
        }
        setSubmitting(false)
      }
      return
    }

    const body: CreateLabourInput = {
      date: state.date,
      employeeId: lockedToEmployeeId ?? state.employeeId,
      projectId: state.projectId,
      hours: hoursNumber,
      labourTime: state.labourTime,
      labourType: state.labourType,
      objectiveEvidence: state.objectiveEvidence,
      notes: state.notes.trim() === '' ? null : state.notes.trim(),
    }

    setSubmitting(true)
    try {
      let recordId: string
      if (mode === 'create') {
        const created = await clientApi<{ entry: LabourEntry }>('/labour', {
          method: 'POST',
          body,
        })
        recordId = created.entry.id
      } else {
        if (!entryId) throw new Error('Missing entry id for edit')
        await clientApi<{ entry: LabourEntry }>(`/labour/${entryId}`, {
          method: 'PATCH',
          body,
        })
        recordId = entryId
      }

      // Attachment reconciliation: delete first (parallel), then upload new
      // files (sequential isn't necessary but parallelism here matters less
      // than predictable error reporting).
      const dels = removedAttachmentIds.map((aid) =>
        clientApi<{ ok: boolean }>(
          `/labour/${recordId}/attachments/${aid}`,
          { method: 'DELETE' },
        ),
      )
      await Promise.all(dels)
      if (pendingFiles.length > 0) {
        await uploadFiles<AttachmentListResponse>(
          `/labour/${recordId}/attachments`,
          pendingFiles,
        )
      }
      // Clear staged changes — successful reconciliation means existing rows
      // are gone server-side and pending files are persisted.
      setPendingFiles([])
      setRemovedAttachmentIds([])

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(onSuccessHref)
        router.refresh()
      }
      // Reset on success so a same-URL nav (edit-in-place flow) doesn't
      // leave the Save button stuck disabled.
      setSubmitting(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Please sign in again.')
      } else {
        setError(
          getServerErrorMessage(
            err,
            'Could not save the labour entry. Please try again.',
          ),
        )
      }
      setSubmitting(false)
    }
  }

  // Live count of entries that would be created in bulk mode. Pure derivation
  // from start/end/skip-weekends — no state needed.
  const bulkPreview = (() => {
    if (!bulkMode || !state.date || !endDate || endDate < state.date) return null
    const start = new Date(`${state.date}T12:00:00Z`)
    const end = new Date(`${endDate}T12:00:00Z`)
    let count = 0
    for (
      let cur = new Date(start);
      cur.getTime() <= end.getTime();
      cur.setUTCDate(cur.getUTCDate() + 1)
    ) {
      const dow = cur.getUTCDay()
      if (skipWeekends && (dow === 0 || dow === 6)) continue
      count++
    }
    return count
  })()

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {mode === 'create' ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2 text-text">
            <input
              type="checkbox"
              checked={bulkMode}
              onChange={(e) => setBulkMode(e.currentTarget.checked)}
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
            />
            Multiple days
            <span className="text-xs text-text-muted">
              (one entry per day in the range)
            </span>
          </label>
          {bulkMode ? (
            <>
              <label className="flex items-center gap-2 text-text">
                <input
                  type="checkbox"
                  checked={skipWeekends}
                  onChange={(e) => setSkipWeekends(e.currentTarget.checked)}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                Skip weekends
              </label>
              {bulkPreview !== null ? (
                <span className="text-xs text-text-muted">
                  Will create{' '}
                  <span className="font-medium text-text">
                    {bulkPreview} {bulkPreview === 1 ? 'entry' : 'entries'}
                  </span>
                  .
                </span>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label={bulkMode ? 'Start date' : 'Date'}
          type="date"
          required
          value={state.date}
          onChange={(e) => update('date', e.currentTarget.value)}
        />
        {bulkMode ? (
          <Field
            label="End date"
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.currentTarget.value)}
          />
        ) : null}
        <Field
          label="Hours"
          type="number"
          inputMode="decimal"
          step="0.25"
          min="0"
          max="24"
          required
          value={state.hours === '' ? '' : String(state.hours)}
          onChange={(e) => {
            const v = e.currentTarget.value
            update('hours', v === '' ? '' : Number(v))
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
              ? 'Standard users can only log labour for themselves.'
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

        <SelectField
          label="Labour Time"
          value={state.labourTime}
          onChange={(e) =>
            update('labourTime', e.currentTarget.value as LabourTime)
          }
        >
          {LABOUR_TIMES.map((v) => (
            <option key={v} value={v}>
              {LABOUR_TIME_LABELS[v]}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Labour Type"
          value={state.labourType}
          onChange={(e) =>
            update('labourType', e.currentTarget.value as LabourType)
          }
        >
          {LABOUR_TYPES.map((v) => (
            <option key={v} value={v}>
              {LABOUR_TYPE_LABELS[v]}
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
              e.currentTarget.value as ObjectiveEvidence,
            )
          }
        >
          {OBJECTIVE_EVIDENCES.map((v) => (
            <option key={v} value={v}>
              {OBJECTIVE_EVIDENCE_LABELS[v]}
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

      {bulkMode ? null : (
        <AttachmentsField
          parentKind="labour"
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
      )}

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
              ? 'Create entry'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
