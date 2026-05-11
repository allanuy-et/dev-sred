'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import type {
  Company,
  CompanyPreferencesInput,
  CompanyPreferencesResponse,
} from '@sred/shared'

import { SUPPORTED_TIMEZONES } from '@/lib/preferences-options'

import { Button } from '@/components/Button'
import { Field, SelectField } from '@/components/Field'
import { ApiError } from '@/lib/api'
import { clientApi } from '@/lib/api.client'
import { useMessages } from '@/lib/i18n-context'

export interface CompanyPreferencesFormProps {
  company: Company
  /** Whether the current user can edit (admin). Non-admins get a read-only view. */
  canEdit: boolean
}

interface FormState {
  name: string
  businessNumber: string
  address1: string
  address2: string
  city: string
  province: string
  postalCode: string
  phone1: string
  phone2: string
  fax: string
  email: string
  website: string
  fiscalYearEnd: string
  financialContact: string
  technicalContact: string
  timezone: string
}

function fromCompany(c: Company): FormState {
  return {
    name: c.name,
    businessNumber: c.businessNumber ?? '',
    address1: c.address1 ?? '',
    address2: c.address2 ?? '',
    city: c.city ?? '',
    province: c.province ?? '',
    postalCode: c.postalCode ?? '',
    phone1: c.phone1 ?? '',
    phone2: c.phone2 ?? '',
    fax: c.fax ?? '',
    email: c.email ?? '',
    website: c.website ?? '',
    // The backend stores fiscalYearEnd as an ISO date string; a <input type=date>
    // expects YYYY-MM-DD.
    fiscalYearEnd: c.fiscalYearEnd ? c.fiscalYearEnd.slice(0, 10) : '',
    financialContact: c.financialContact ?? '',
    technicalContact: c.technicalContact ?? '',
    timezone: c.timezone,
  }
}

function toNullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

const SUCCESS_CLEAR_MS = 2_500

export function CompanyPreferencesForm({
  company,
  canEdit,
}: CompanyPreferencesFormProps) {
  const router = useRouter()
  const t = useMessages()
  const [state, setState] = useState<FormState>(() => fromCompany(company))
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const clearRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (clearRef.current) clearTimeout(clearRef.current)
    }
  }, [])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canEdit) return
    setError(null)
    setSuccess(false)

    if (!state.name.trim()) {
      setError('Company name is required.')
      return
    }

    setSubmitting(true)
    const body: CompanyPreferencesInput = {
      name: state.name.trim(),
      businessNumber: toNullable(state.businessNumber),
      address1: toNullable(state.address1),
      address2: toNullable(state.address2),
      city: toNullable(state.city),
      province: toNullable(state.province),
      postalCode: toNullable(state.postalCode),
      phone1: toNullable(state.phone1),
      phone2: toNullable(state.phone2),
      fax: toNullable(state.fax),
      email: toNullable(state.email),
      website: toNullable(state.website),
      fiscalYearEnd: state.fiscalYearEnd === '' ? null : state.fiscalYearEnd,
      financialContact: toNullable(state.financialContact),
      technicalContact: toNullable(state.technicalContact),
      timezone: state.timezone,
    }

    try {
      await clientApi<CompanyPreferencesResponse>('/preferences/company', {
        method: 'PATCH',
        body,
      })
      setSuccess(true)
      if (clearRef.current) clearTimeout(clearRef.current)
      clearRef.current = setTimeout(() => setSuccess(false), SUCCESS_CLEAR_MS)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t.auth.sessionExpired)
      } else {
        setError(t.common.genericError)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Shared field disabled flag. Disabled rather than read-only so the visual
  // treatment from the Field component (opacity-50) makes the gate obvious.
  const fieldsDisabled = !canEdit || submitting

  return (
    <form onSubmit={handleSubmit} className="space-y-10" noValidate>
      {!canEdit ? (
        <p
          role="note"
          className="rounded-md border border-border bg-accent-soft px-3 py-2 text-xs text-accent"
        >
          {t.prefs.readOnlyNote}
        </p>
      ) : null}

      <section className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">Identity</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            label="Company name"
            required
            value={state.name}
            onChange={(e) => update('name', e.currentTarget.value)}
            disabled={fieldsDisabled}
          />
          <Field
            label="Business number"
            value={state.businessNumber}
            onChange={(e) => update('businessNumber', e.currentTarget.value)}
            disabled={fieldsDisabled}
          />
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">Address</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            label="Address line 1"
            value={state.address1}
            onChange={(e) => update('address1', e.currentTarget.value)}
            disabled={fieldsDisabled}
            className="sm:col-span-2"
          />
          <Field
            label="Address line 2"
            value={state.address2}
            onChange={(e) => update('address2', e.currentTarget.value)}
            disabled={fieldsDisabled}
            className="sm:col-span-2"
          />
          <Field
            label="City"
            value={state.city}
            onChange={(e) => update('city', e.currentTarget.value)}
            disabled={fieldsDisabled}
          />
          <Field
            label="Province"
            value={state.province}
            onChange={(e) => update('province', e.currentTarget.value)}
            disabled={fieldsDisabled}
          />
          <Field
            label="Postal code"
            value={state.postalCode}
            onChange={(e) => update('postalCode', e.currentTarget.value)}
            disabled={fieldsDisabled}
          />
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">Contact</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            label="Phone 1"
            type="tel"
            value={state.phone1}
            onChange={(e) => update('phone1', e.currentTarget.value)}
            disabled={fieldsDisabled}
          />
          <Field
            label="Phone 2"
            type="tel"
            value={state.phone2}
            onChange={(e) => update('phone2', e.currentTarget.value)}
            disabled={fieldsDisabled}
          />
          <Field
            label="Fax"
            type="tel"
            value={state.fax}
            onChange={(e) => update('fax', e.currentTarget.value)}
            disabled={fieldsDisabled}
          />
          <Field
            label="Email"
            type="email"
            value={state.email}
            onChange={(e) => update('email', e.currentTarget.value)}
            disabled={fieldsDisabled}
          />
          <Field
            label="Website"
            type="url"
            value={state.website}
            onChange={(e) => update('website', e.currentTarget.value)}
            disabled={fieldsDisabled}
            className="sm:col-span-2"
          />
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">
          Operations
        </h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            label="Fiscal year end"
            type="date"
            value={state.fiscalYearEnd}
            onChange={(e) => update('fiscalYearEnd', e.currentTarget.value)}
            disabled={fieldsDisabled}
          />
          <SelectField
            label="Time zone"
            value={state.timezone}
            onChange={(e) => update('timezone', e.currentTarget.value)}
            disabled={fieldsDisabled}
            helper="Default for new employees. Doesn't change existing users' tz."
          >
            {SUPPORTED_TIMEZONES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectField>
          <Field
            label="Financial contact"
            value={state.financialContact}
            onChange={(e) => update('financialContact', e.currentTarget.value)}
            disabled={fieldsDisabled}
          />
          <Field
            label="Technical contact"
            value={state.technicalContact}
            onChange={(e) => update('technicalContact', e.currentTarget.value)}
            disabled={fieldsDisabled}
          />
        </div>
      </section>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      ) : null}

      {success ? (
        <p
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-success"
        >
          Company preferences saved.
        </p>
      ) : null}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={fieldsDisabled}>
          {t.common.save}
        </Button>
      </div>
    </form>
  )
}
