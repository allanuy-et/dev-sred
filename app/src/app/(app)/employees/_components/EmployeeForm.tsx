'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type {
  AccessLevel,
  CreateEmployeeInput,
  EmployeeResponse,
  PaidType,
  UpdateEmployeeInput,
  User,
} from '@sred/shared'

import { Button } from '@/components/Button'
import { Field, SelectField, TextAreaField } from '@/components/Field'
import { ApiError, getServerErrorMessage } from '@/lib/api'
import { clientApi } from '@/lib/api.client'
import {
  ACCESS_LEVELS,
  ACCESS_LEVEL_LABELS,
  PAID_TYPES,
  PAID_TYPE_LABELS,
} from '@/lib/employee-labels'

export interface EmployeeFormInitial {
  email: string
  password: string
  firstName: string
  lastName: string
  role: string
  accessLevel: AccessLevel
  regularRate: number | ''
  overtimeRate: number | ''
  holidayRate: number | ''
  paid: PaidType
  hoursPerYear: number | ''
  specifiedEmployee: boolean
  startDate: string
  qualifications: string
}

export interface EmployeeFormProps {
  mode: 'create' | 'edit'
  initial: EmployeeFormInitial
  /** Required for `edit` mode. */
  employeeId?: string
  /**
   * Where to navigate on a successful save. Ignored when `onSuccess` is
   * provided. Defaults to `/employees`.
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

function toOptionalNumber(value: number | ''): number | undefined {
  return value === '' ? undefined : value
}

function toNullableTrimmed(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function EmployeeForm({
  mode,
  initial,
  employeeId,
  onSuccessHref = '/employees',
  onCancelHref,
  onSuccess,
  onCancel,
}: EmployeeFormProps) {
  const router = useRouter()
  const [state, setState] = useState<EmployeeFormInitial>(initial)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof EmployeeFormInitial>(
    key: K,
    value: EmployeeFormInitial[K],
  ) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const email = state.email.trim()
    if (!email) {
      setError('Please enter an email address.')
      return
    }
    // Cheap email shape check — the server enforces a stricter pattern, but
    // catching obvious typos client-side avoids a round-trip.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (mode === 'create' && state.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!state.firstName.trim() || !state.lastName.trim()) {
      setError('Please enter both a first and last name.')
      return
    }
    // Mirrors the API: hoursPerYear must be a non-negative integer; rates
    // must be non-negative numbers when provided.
    const hpy = toOptionalNumber(state.hoursPerYear)
    if (hpy !== undefined && (!Number.isInteger(hpy) || hpy < 0)) {
      setError('Hours per year must be a non-negative whole number.')
      return
    }
    const rateChecks: Array<[string, number | undefined]> = [
      ['Regular rate', toOptionalNumber(state.regularRate)],
      ['Overtime rate', toOptionalNumber(state.overtimeRate)],
      ['Holiday rate', toOptionalNumber(state.holidayRate)],
    ]
    for (const [label, n] of rateChecks) {
      if (n !== undefined && (!Number.isFinite(n) || n < 0)) {
        setError(`${label} must be a non-negative number.`)
        return
      }
    }

    setSubmitting(true)
    try {
      if (mode === 'create') {
        const body: CreateEmployeeInput = {
          email: state.email.trim(),
          password: state.password,
          firstName: state.firstName.trim(),
          lastName: state.lastName.trim(),
          accessLevel: state.accessLevel,
          role: toNullableTrimmed(state.role),
          startDate: state.startDate === '' ? null : state.startDate,
          paid: state.paid,
          hoursPerYear: toOptionalNumber(state.hoursPerYear),
          regularRate: toOptionalNumber(state.regularRate),
          overtimeRate: toOptionalNumber(state.overtimeRate),
          holidayRate: toOptionalNumber(state.holidayRate),
          specifiedEmployee: state.specifiedEmployee,
          qualifications: toNullableTrimmed(state.qualifications),
        }
        await clientApi<EmployeeResponse>('/employees', {
          method: 'POST',
          body,
        })
      } else {
        if (!employeeId) throw new Error('Missing employee id for edit')
        const body: UpdateEmployeeInput = {
          email: state.email.trim(),
          firstName: state.firstName.trim(),
          lastName: state.lastName.trim(),
          accessLevel: state.accessLevel,
          role: toNullableTrimmed(state.role),
          startDate: state.startDate === '' ? null : state.startDate,
          paid: state.paid,
          hoursPerYear: toOptionalNumber(state.hoursPerYear),
          regularRate: toOptionalNumber(state.regularRate),
          overtimeRate: toOptionalNumber(state.overtimeRate),
          holidayRate: toOptionalNumber(state.holidayRate),
          specifiedEmployee: state.specifiedEmployee,
          qualifications: toNullableTrimmed(state.qualifications),
        }
        await clientApi<EmployeeResponse>(`/employees/${employeeId}`, {
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
      // Reset submitting on success too. When the success target is the same
      // URL we're already on (e.g. /employees/:id/edit → /employees/:id and
      // the caller toggles editing locally), Next.js doesn't unmount us, so
      // a lingering `submitting=true` would freeze the Save button.
      setSubmitting(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Please sign in again.')
      } else if (err instanceof ApiError && err.status === 409) {
        setError('An employee with this email already exists.')
      } else {
        setError(
          getServerErrorMessage(
            err,
            'Could not save the employee. Please try again.',
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
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={state.email}
          onChange={(e) => update('email', e.currentTarget.value)}
          disabled={mode === 'edit'}
          helper={
            mode === 'edit' ? 'Email cannot be changed after creation.' : undefined
          }
        />
        {mode === 'create' ? (
          <Field
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={state.password}
            onChange={(e) => update('password', e.currentTarget.value)}
            helper="At least 8 characters."
          />
        ) : (
          <div />
        )}

        <Field
          label="First name"
          autoComplete="given-name"
          required
          value={state.firstName}
          onChange={(e) => update('firstName', e.currentTarget.value)}
        />
        <Field
          label="Last name"
          autoComplete="family-name"
          required
          value={state.lastName}
          onChange={(e) => update('lastName', e.currentTarget.value)}
        />

        <Field
          label="Role / Title"
          value={state.role}
          onChange={(e) => update('role', e.currentTarget.value)}
        />
        <SelectField
          label="Access level"
          value={state.accessLevel}
          onChange={(e) =>
            update('accessLevel', e.currentTarget.value as AccessLevel)
          }
        >
          {ACCESS_LEVELS.map((v) => (
            <option key={v} value={v}>
              {ACCESS_LEVEL_LABELS[v]}
            </option>
          ))}
        </SelectField>

        <Field
          label="Regular rate ($/hr)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={state.regularRate === '' ? '' : String(state.regularRate)}
          onChange={(e) => {
            const v = e.currentTarget.value
            update('regularRate', v === '' ? '' : Number(v))
          }}
          helper={
            mode === 'edit'
              ? 'For an effective-dated change, use "Add wage change" on the employee profile.'
              : undefined
          }
        />
        <Field
          label="Overtime rate ($/hr)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={state.overtimeRate === '' ? '' : String(state.overtimeRate)}
          onChange={(e) => {
            const v = e.currentTarget.value
            update('overtimeRate', v === '' ? '' : Number(v))
          }}
        />
        <Field
          label="Holiday rate ($/hr)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={state.holidayRate === '' ? '' : String(state.holidayRate)}
          onChange={(e) => {
            const v = e.currentTarget.value
            update('holidayRate', v === '' ? '' : Number(v))
          }}
        />
        <SelectField
          label="Paid"
          value={state.paid}
          onChange={(e) => update('paid', e.currentTarget.value as PaidType)}
        >
          {PAID_TYPES.map((v) => (
            <option key={v} value={v}>
              {PAID_TYPE_LABELS[v]}
            </option>
          ))}
        </SelectField>

        <Field
          label="Hours per year"
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          value={state.hoursPerYear === '' ? '' : String(state.hoursPerYear)}
          onChange={(e) => {
            const v = e.currentTarget.value
            update('hoursPerYear', v === '' ? '' : Number(v))
          }}
        />
        <SelectField
          label="Specified employee"
          value={state.specifiedEmployee ? 'yes' : 'no'}
          onChange={(e) =>
            update('specifiedEmployee', e.currentTarget.value === 'yes')
          }
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </SelectField>

        <Field
          label="Start date"
          type="date"
          value={state.startDate}
          onChange={(e) => update('startDate', e.currentTarget.value)}
        />
        <div />
      </div>

      <TextAreaField
        label="Qualifications"
        value={state.qualifications}
        onChange={(e) => update('qualifications', e.currentTarget.value)}
        rows={4}
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
              ? 'Create employee'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

/** Map a User record into the form's initial state. */
export function userToFormInitial(user: User): EmployeeFormInitial {
  return {
    email: user.email,
    password: '',
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role ?? '',
    accessLevel: user.accessLevel,
    regularRate: user.regularRate,
    overtimeRate: user.overtimeRate,
    holidayRate: user.holidayRate,
    paid: user.paid,
    hoursPerYear: user.hoursPerYear,
    specifiedEmployee: user.specifiedEmployee,
    startDate: user.startDate ? user.startDate.slice(0, 10) : '',
    qualifications: user.qualifications ?? '',
  }
}
