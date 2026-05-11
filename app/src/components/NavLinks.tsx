'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useMessages } from '@/lib/i18n-context'

interface NavItem {
  href: string
  labelKey: keyof ReturnType<typeof useMessages>['nav']
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/dashboard', labelKey: 'dashboard' },
  { href: '/projects', labelKey: 'projects' },
  { href: '/employees', labelKey: 'employees' },
  { href: '/labour', labelKey: 'labour' },
  { href: '/expenses', labelKey: 'expenses' },
  { href: '/reports', labelKey: 'reports' },
  { href: '/preferences', labelKey: 'preferences' },
]

function cn(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ')
}

export function NavLinks() {
  const pathname = usePathname() ?? ''
  const t = useMessages()

  return (
    <nav className="flex items-center gap-1" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'inline-flex items-center rounded-md px-3 py-1.5 text-sm transition-colors',
              active
                ? 'bg-accent-soft font-medium text-accent'
                : 'text-text-muted hover:bg-surface-hover hover:text-text',
            )}
            aria-current={active ? 'page' : undefined}
          >
            {t.nav[item.labelKey]}
          </Link>
        )
      })}
    </nav>
  )
}
