'use client'

import { useRouter } from 'next/navigation'
import { useState, useSyncExternalStore } from 'react'

import { Button } from '@/components/Button'
import { Field } from '@/components/Field'
import { ApiError } from '@/lib/api'
import { clientApi } from '@/lib/api.client'
import type { SessionUser } from '@/lib/auth'
import { getMessages } from '@/lib/i18n'

interface LoginResponseBody {
  user: SessionUser
}

// Login renders **before** auth, so the I18nProvider in AppShell isn't
// available here. Resolve locale once from the browser's preferred language
// and use the catalog directly — no context needed at this stage in the flow.
//
// `useSyncExternalStore` is the React-19-blessed way to read a browser-only
// value (no DOM events to subscribe to → `subscribe` is a no-op). The server
// snapshot returns `undefined` so SSR renders the `en` fallback; the client
// snapshot returns `navigator.language` after hydration. This matches React's
// hydration contract without tripping the set-state-in-effect lint.
function subscribe(): () => void {
  return () => {}
}
function getClientLanguage(): string | undefined {
  return typeof navigator !== 'undefined' ? navigator.language : undefined
}
function getServerLanguage(): string | undefined {
  return undefined
}

function useBrowserLocale(): string | undefined {
  return useSyncExternalStore(subscribe, getClientLanguage, getServerLanguage)
}

export default function LoginPage() {
  const router = useRouter()
  // Dev convenience: pre-fill with the seeded account so the demo is fast.
  const [email, setEmail] = useState('scott@etcweb.com')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const browserLang = useBrowserLocale()
  const t = getMessages(browserLang ?? 'en')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await clientApi<LoginResponseBody>('/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t.auth.invalidCredentials)
      } else {
        setError(t.common.genericError)
      }
      setSubmitting(false)
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">{t.auth.signInTitle}</h1>
        <p className="mt-2 text-sm text-text-muted">{t.auth.signInSubtitle}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <Field
            label={t.auth.email}
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <Field
            label={t.auth.password}
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />

          {error ? (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-danger"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !email || !password}
          >
            {submitting ? t.auth.signingIn : t.auth.signIn}
          </Button>
        </form>
      </div>
    </main>
  )
}
