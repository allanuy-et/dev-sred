import type { ReactNode } from 'react'

import type { SessionUser } from '@/lib/auth'

import { LogoutButton } from './LogoutButton'
import { NavLinks } from './NavLinks'

export interface AppShellProps {
  user: SessionUser
  children: ReactNode
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 h-14 border-b border-border bg-surface">
        <div className="mx-auto flex h-full w-full max-w-[1120px] items-center justify-between gap-6 px-6">
          <div className="flex h-full items-center gap-8">
            <span className="text-sm font-semibold tracking-tight">
              SR&amp;ED Manager
            </span>
            <NavLinks />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-muted">
              {user.firstName} {user.lastName}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1120px] px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
