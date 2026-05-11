'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type {
  CreateLabourInput,
  LabourEntry,
  LabourTime,
  LabourType,
  ObjectiveEvidence,
} from '@sred/shared'

import { Button } from '@/components/Button'
import { Field, SelectField, TextAreaField } from '@/components/Field'
import { ApiError } from '@/lib/api'
import { clientApi } from '@/lib/api.client'
import {
  LABOUR_TIMES,
  LABOUR_TIME_LABELS,
  LABOUR_TYPES,
  LABOUR_TYPE_LABELS,
  OBJECTIVE_EVIDENCES,
  OBJECTIVE_EVIDENCE_LABELS,
} from '@/lib/labour-labels'

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
  employees: SelectOption[]
  projects: SelectOption[]
  /** Required for `edit` mode. */
  entryId?: string
  /** Where to navigate on a successful save. Defaults to `/labour`. */
  onSuccessHref?: string
  /** Optional secondary action (e.g. cancel back to detail). */
  onCancelHref?: string
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
}: LabourFormProps) {
  const router = useRouter()
  const [state, setState] = useState<LabourFormInitial>(initial)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof LabourFormInitial>(
    key: K,
    value: LabourFormInitial[K],
  ) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const hoursNumber =
      typeof state.hours === 'number' ? state.hours : Number(state.hours)
    if (!Number.isFinite(hoursNumber) || hoursNumber <= 0) {
      setError('Hours must be a positive number.')
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

    const body: CreateLabourInput = {
      date: state.date,
      employeeId: state.employeeId,
      projectId: state.projectId,
      hours: hoursNumber,
      labourTime: state.labourTime,
      labourType: state.labourType,
      objectiveEvidence: state.objectiveEvidence,
      notes: state.notes.trim() === '' ? null : state.notes.trim(),
    }

    setSubmitting(true)
    try {
      if (mode === 'create') {
        await clientApi<{ entry: LabourEntry }>('/labour', {
          method: 'POST',
          body,
        })
      } else {
        if (!entryId) throw new Error('Missing entry id for edit')
        await clientApi<{ entry: LabourEntry }>(`/labour/${entryId}`, {
          method: 'PATCH',
          body,
        })
      }
      router.push(onSuccessHref)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Please sign in again.')
      } else if (err instanceof ApiError && err.status === 400) {
        setError('Please double-check the entry — something looked off.')
      } else {
        setError('Could not save the labour entry. Please try again.')
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
          label="Hours"
          type="number"
          inputMode="decimal"
          step="0.25"
          min="0"
          required
          value={state.hours === '' ? '' : String(state.hours)}
          onChange={(e) => {
            const v = e.currentTarget.value
            update('hours', v === '' ? '' : Number(v))
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

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        {onCancelHref ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(onCancelHref)}
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
