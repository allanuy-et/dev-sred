import type { ReactNode } from 'react'

import type { SessionUser } from '@/lib/auth'
import { TimezoneProvider } from '@/lib/timezone-context'

import { GlobalSearch } from './GlobalSearch'
import { LogoutButton } from './LogoutButton'
import { NavLinks } from './NavLinks'

export interface AppShellProps {
  user: SessionUser
  children: ReactNode
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <TimezoneProvider tz={user.timezone}>
      <div className="flex min-h-screen flex-col">
        <header className="no-print sticky top-0 z-10 h-16 border-b border-border bg-surface">
          <div className="mx-auto flex h-full w-full max-w-[1360px] items-center justify-between gap-6 px-8 lg:px-16">
            <div className="flex h-full items-center gap-8">
              <span className="text-sm font-semibold tracking-tight">
                SR&amp;ED Manager
              </span>
              <NavLinks />
            </div>
            <div className="flex items-center gap-3">
              <GlobalSearch />
              <span className="text-sm text-text-muted">
                {user.firstName} {user.lastName}
              </span>
              <LogoutButton />
            </div>
          </div>
        </header>
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1360px] px-8 py-10 lg:px-16 lg:py-16">
            {children}
          </div>
        </main>
      </div>
    </TimezoneProvider>
  )
}
