'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import type {
  MeResponse,
  SessionUser,
  UserPreferencesInput,
} from '@sred/shared'

import { SUPPORTED_LANGUAGES, SUPPORTED_TIMEZONES } from '@/lib/preferences-options'

import { Button } from '@/components/Button'
import { Field, SelectField } from '@/components/Field'
import { ApiError } from '@/lib/api'
import { clientApi } from '@/lib/api.client'

export interface UserPreferencesFormProps {
  /**
   * The current session user. Includes timezone + language. `role` lives on
   * the full `User` record, not `SessionUser` — passed separately so the
   * server can read it once and hand the form an initial value without the
   * client refetching.
   */
  user: SessionUser
  initialRole: string | null
}

const SUCCESS_CLEAR_MS = 2_500

export function UserPreferencesForm({
  user,
  initialRole,
}: UserPreferencesFormProps) {
  const router = useRouter()
  const [role, setRole] = useState(initialRole ?? '')
  const [timezone, setTimezone] = useState(user.timezone)
  const [language, setLanguage] = useState(user.language)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const clearRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Cleanup any pending timer on unmount.
    return () => {
      if (clearRef.current) clearTimeout(clearRef.current)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)

    const body: UserPreferencesInput = {
      role: role.trim() === '' ? null : role.trim(),
      timezone,
      language,
    }

    try {
      await clientApi<MeResponse>('/preferences/user', {
        method: 'PATCH',
        body,
      })
      setSuccess(true)
      if (clearRef.current) clearTimeout(clearRef.current)
      clearRef.current = setTimeout(() => setSuccess(false), SUCCESS_CLEAR_MS)
      // Re-fetch the layout so AppShell re-mounts with the new tz.
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Please sign in again.')
      } else if (err instanceof ApiError && err.status === 400) {
        setError('Please double-check the values — something looked off.')
      } else {
        setError('Could not save your preferences. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Field
        label="Email"
        type="email"
        value={user.email}
        disabled
        readOnly
        helper="Contact an administrator to change your email address."
      />

      <Field
        label="Role / Title"
        value={role}
        onChange={(e) => setRole(e.currentTarget.value)}
        placeholder="e.g. Senior Engineer"
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <SelectField
          label="Language"
          value={language}
          onChange={(e) => setLanguage(e.currentTarget.value)}
        >
          {SUPPORTED_LANGUAGES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Time zone"
          value={timezone}
          onChange={(e) => setTimezone(e.currentTarget.value)}
          helper="Dates throughout the app are shown in this timezone."
        >
          {SUPPORTED_TIMEZONES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>
      </div>

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
          Preferences saved.
        </p>
      ) : null}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save preferences'}
        </Button>
      </div>
    </form>
  )
}
