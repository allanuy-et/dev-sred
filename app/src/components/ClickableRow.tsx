'use client'

import { useRouter } from 'next/navigation'
import type { KeyboardEvent, ReactNode } from 'react'

function cn(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Internal client component powering `<TRLink>`. Lives in its own file so the
 * Table re-exports stay server-friendly — only this row body is a client
 * boundary.
 */
export function ClickableRow({
  href,
  accessibleLabel,
  children,
  className,
}: {
  href: string
  accessibleLabel: string
  children: ReactNode
  className?: string
}) {
  const router = useRouter()

  function handleKeyDown(e: KeyboardEvent<HTMLTableRowElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      // If the user is interacting with a focusable child (a button, a link,
      // an input), let that element handle the key. We only navigate when the
      // <tr> itself is the active element.
      if (e.currentTarget !== e.target) return
      e.preventDefault()
      router.push(href)
    }
  }

  return (
    <tr
      onClick={() => router.push(href)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="link"
      aria-label={accessibleLabel}
      className={cn(
        'cursor-pointer hover:bg-surface-hover focus:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
        className,
      )}
    >
      {children}
    </tr>
  )
}
