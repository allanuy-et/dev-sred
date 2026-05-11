'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { LabourEntryWithRelations } from '@sred/shared'

import { Button } from '@/components/Button'
import { ApiError } from '@/lib/api'
import { clientApi } from '@/lib/api.client'
import { formatDate, formatHours } from '@/lib/format'
import {
  LABOUR_TIME_LABELS,
  LABOUR_TYPE_LABELS,
  OBJECTIVE_EVIDENCE_LABELS,
} from '@/lib/labour-labels'

import { LabourForm, type LabourFormInitial } from '../../_components/LabourForm'
import type { SelectOption } from '../../_lib/selectOptions'

export interface LabourDetailProps {
  entry: LabourEntryWithRelations
  employees: SelectOption[]
  projects: SelectOption[]
}

export function LabourDetail({
  entry,
  employees,
  projects,
}: LabourDetailProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!window.confirm('Delete this labour entry? This cannot be undone.')) {
      return
    }
    setError(null)
    setDeleting(true)
    try {
      await clientApi<{ ok: boolean }>(`/labour/${entry.id}`, {
        method: 'DELETE',
      })
      router.push('/labour')
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Please sign in again.')
      } else {
        setError('Could not delete the entry. Please try again.')
      }
      setDeleting(false)
    }
  }

  if (editing) {
    const initial: LabourFormInitial = {
      date: entry.date.slice(0, 10),
      employeeId: entry.employeeId,
      projectId: entry.projectId,
      hours: entry.hours,
      labourTime: entry.labourTime,
      labourType: entry.labourType,
      objectiveEvidence: entry.objectiveEvidence,
      notes: entry.notes ?? '',
    }
    return (
      <LabourForm
        mode="edit"
        entryId={entry.id}
        initial={initial}
        employees={employees}
        projects={projects}
        onSuccessHref={`/labour/${entry.id}`}
        onCancelHref={`/labour/${entry.id}`}
      />
    )
  }

  return (
    <div className="space-y-8">
      <dl className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
        <DescriptionItem label="Date" value={formatDate(entry.date)} />
        <DescriptionItem
          label="Hours"
          value={
            <span className="tabular-nums">{formatHours(entry.hours)}</span>
          }
        />
        <DescriptionItem label="Employee" value={entry.employeeName} />
        <DescriptionItem label="Project" value={entry.projectName} />
        <DescriptionItem
          label="Labour Time"
          value={LABOUR_TIME_LABELS[entry.labourTime]}
        />
        <DescriptionItem
          label="Labour Type"
          value={LABOUR_TYPE_LABELS[entry.labourType]}
        />
        <DescriptionItem
          label="Objective Evidence"
          value={OBJECTIVE_EVIDENCE_LABELS[entry.objectiveEvidence]}
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
