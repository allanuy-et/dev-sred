'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { WageHistoryEntryResponse } from '@sred/shared'

import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import { Field, TextAreaField } from '@/components/Field'
import { ApiError, getServerErrorMessage } from '@/lib/api'
import { clientApi } from '@/lib/api.client'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface WageChangeFormDialogProps {
  employeeId: string
  /** Pre-fill rate fields with the employee's current rates. */
  defaults: {
    regularRate: number
    overtimeRate: number
    holidayRate: number
  }
  triggerLabel?: string
  triggerVariant?: 'primary' | 'secondary'
  triggerSize?: 'default' | 'sm'
  triggerClassName?: string
}

/**
 * Add-wage-change action. Inserts a wage_history row with an effective date;
 * if the date is on or before today (in the caller's tz) the API also mirrors
 * the new rates onto `users.*` so the "current" snapshot stays in sync.
 */
export function WageChangeFormDialog({
  employeeId,
  defaults,
  triggerLabel = '+ Add wage change',
  triggerVariant = 'secondary',
  triggerSize = 'sm',
  triggerClassName,
}: WageChangeFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [effectiveDate, setEffectiveDate] = useState(todayIso())
  const [regularRate, setRegularRate] = useState<number | ''>(defaults.regularRate)
  const [overtimeRate, setOvertimeRate] = useState<number | ''>(defaults.overtimeRate)
  const [holidayRate, setHolidayRate] = useState<number | ''>(defaults.holidayRate)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setEffectiveDate(todayIso())
    setRegularRate(defaults.regularRate)
    setOvertimeRate(defaults.overtimeRate)
    setHolidayRate(defaults.holidayRate)
    setNote('')
    setError(null)
  }

  function close() {
    setOpen(false)
    reset()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const reg = typeof regularRate === 'number' ? regularRate : Number(regularRate)
    const ot = typeof overtimeRate === 'number' ? overtimeRate : Number(overtimeRate)
    const hol = typeof holidayRate === 'number' ? holidayRate : Number(holidayRate)
    for (const [label, n] of [
      ['Regular rate', reg],
      ['Overtime rate', ot],
      ['Holiday rate', hol],
    ] as const) {
      if (!Number.isFinite(n) || n < 0) {
        setError(`${label} must be a non-negative number.`)
        return
      }
    }

    setSubmitting(true)
    try {
      await clientApi<WageHistoryEntryResponse>(
        `/employees/${employeeId}/wage-history`,
        {
          method: 'POST',
          body: {
            effectiveDate,
            regularRate: reg,
            overtimeRate: ot,
            holidayRate: hol,
            note: note.trim() === '' ? null : note.trim(),
          },
        },
      )
      close()
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Please sign in again.')
      } else {
        setError(
          getServerErrorMessage(
            err,
            'Could not save the wage change. Please try again.',
          ),
        )
      }
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>
      <Dialog title="Add wage change" open={open} onClose={close}>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <Field
            label="Effective date"
            type="date"
            required
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.currentTarget.value)}
            helper="Rates apply from this date forward. Future dates are saved but don't change the current rate until that day."
          />
          <div className="grid gap-6 sm:grid-cols-3">
            <Field
              label="Regular rate"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              value={regularRate === '' ? '' : String(regularRate)}
              onChange={(e) => {
                const v = e.currentTarget.value
                setRegularRate(v === '' ? '' : Number(v))
              }}
            />
            <Field
              label="Overtime rate"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              value={overtimeRate === '' ? '' : String(overtimeRate)}
              onChange={(e) => {
                const v = e.currentTarget.value
                setOvertimeRate(v === '' ? '' : Number(v))
              }}
            />
            <Field
              label="Holiday rate"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              value={holidayRate === '' ? '' : String(holidayRate)}
              onChange={(e) => {
                const v = e.currentTarget.value
                setHolidayRate(v === '' ? '' : Number(v))
              }}
            />
          </div>
          <TextAreaField
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            rows={2}
            placeholder="e.g. annual increase, role change"
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
            <Button
              type="button"
              variant="secondary"
              onClick={close}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save wage change'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
