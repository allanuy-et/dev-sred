'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/projects', label: 'Projects' },
  { href: '/employees', label: 'Employees' },
  { href: '/labour', label: 'Labour' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/reports', label: 'Reports' },
  { href: '/preferences', label: 'Preferences' },
]

function cn(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ')
}

export function NavLinks() {
  const pathname = usePathname() ?? ''

  return (
    <nav className="flex h-full items-stretch gap-1" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'inline-flex items-center border-b-2 px-3 text-sm transition-colors',
              active
                ? 'border-accent font-medium text-text'
                : 'border-transparent text-text-muted hover:text-text',
            )}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
