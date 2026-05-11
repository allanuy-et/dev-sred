'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { logout } from '@/lib/auth.client'
import { useMessages } from '@/lib/i18n-context'

import { Button } from './Button'

export function LogoutButton() {
  const router = useRouter()
  const t = useMessages()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      try {
        await logout()
        router.push('/login')
        router.refresh()
      } catch {
        setError(t.common.genericError)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      <Button
        variant="secondary"
        size="sm"
        onClick={handleClick}
        disabled={pending}
      >
        {t.auth.signOut}
      </Button>
    </div>
  )
}
