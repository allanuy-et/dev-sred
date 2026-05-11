'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { User } from '@sred/shared'

import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { ApiError } from '@/lib/api'
import { clientApi } from '@/lib/api.client'
import {
  ACCESS_LEVEL_LABELS,
  PAID_TYPE_LABELS,
} from '@/lib/employee-labels'
import { formatDate } from '@/lib/format'

import {
  EmployeeForm,
  userToFormInitial,
} from '../../_components/EmployeeForm'

export interface EmployeeDetailProps {
  employee: User
}

function formatRate(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}/hr`
}

export function EmployeeDetail({ employee }: EmployeeDetailProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isActive = employee.status === 'active'

  async function handleToggleStatus() {
    const action = isActive ? 'deactivate' : 'reactivate'
    if (action === 'deactivate') {
      if (
        !window.confirm(
          `Deactivate ${employee.firstName} ${employee.lastName}? They will lose access until reactivated.`,
        )
      ) {
        return
      }
    }
    setError(null)
    setPending(true)
    try {
      await clientApi<{ ok: boolean }>(`/employees/${employee.id}/${action}`, {
        method: 'POST',
      })
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Please sign in again.')
      } else {
        setError(
          isActive
            ? 'Could not deactivate the employee. Please try again.'
            : 'Could not reactivate the employee. Please try again.',
        )
      }
    } finally {
      setPending(false)
    }
  }

  if (editing) {
    return (
      <EmployeeForm
        mode="edit"
        employeeId={employee.id}
        initial={userToFormInitial(employee)}
        onSuccessHref={`/employees/${employee.id}`}
        onCancelHref={`/employees/${employee.id}`}
      />
    )
  }

  return (
    <div className="space-y-6">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <DescriptionItem
          label="Status"
          value={
            isActive ? (
              <Badge variant="active">Active</Badge>
            ) : (
              <Badge variant="neutral">Inactive</Badge>
            )
          }
        />
        <DescriptionItem
          label="Access level"
          value={ACCESS_LEVEL_LABELS[employee.accessLevel]}
        />
        <DescriptionItem label="Role / Title" value={employee.role ?? '—'} />
        <DescriptionItem
          label="Start date"
          value={formatDate(employee.startDate)}
        />
        <DescriptionItem
          label="Paid"
          value={PAID_TYPE_LABELS[employee.paid]}
        />
        <DescriptionItem
          label="Hours per year"
          value={
            <span className="tabular-nums">
              {employee.hoursPerYear.toLocaleString()}
            </span>
          }
        />
        <DescriptionItem
          label="Regular rate"
          value={
            <span className="tabular-nums">
              {formatRate(employee.regularRate)}
            </span>
          }
        />
        <DescriptionItem
          label="Overtime rate"
          value={
            <span className="tabular-nums">
              {formatRate(employee.overtimeRate)}
            </span>
          }
        />
        <DescriptionItem
          label="Holiday rate"
          value={
            <span className="tabular-nums">
              {formatRate(employee.holidayRate)}
            </span>
          }
        />
        <DescriptionItem
          label="Specified employee"
          value={employee.specifiedEmployee ? 'Yes' : 'No'}
        />
        <DescriptionItem
          label="Qualifications"
          value={employee.qualifications ?? '—'}
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
          variant={isActive ? 'destructive' : 'secondary'}
          onClick={handleToggleStatus}
          disabled={pending}
        >
          {pending
            ? isActive
              ? 'Deactivating…'
              : 'Reactivating…'
            : isActive
              ? 'Deactivate'
              : 'Reactivate'}
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
      <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-text">{value}</dd>
    </div>
  )
}
