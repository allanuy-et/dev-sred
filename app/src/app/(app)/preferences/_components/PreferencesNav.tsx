'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useMessages } from '@/lib/i18n-context'

interface PreferencesNavItem {
  href: string
  labelKey: 'userTab' | 'companyTab'
}

const ITEMS: ReadonlyArray<PreferencesNavItem> = [
  { href: '/preferences', labelKey: 'userTab' },
  { href: '/preferences/company', labelKey: 'companyTab' },
]

function cn(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Tabbed sub-nav for the Preferences section. The design system doesn't yet
 * specify a tab pattern, so this uses a conservative "underlined active tab"
 * variant built from existing tokens — same hover/active palette as the top
 * nav, expressed as a bottom border rather than a rounded pill so it reads
 * as nested navigation rather than competing with the global nav.
 */
export function PreferencesNav() {
  const pathname = usePathname() ?? ''
  const t = useMessages()

  return (
    <nav
      className="border-b border-border"
      aria-label="Preferences sections"
    >
      <ul className="-mb-px flex gap-1">
        {ITEMS.map((item) => {
          // Exact match for /preferences so the User tab doesn't also light up
          // when on /preferences/company.
          const active =
            item.href === '/preferences'
              ? pathname === '/preferences'
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center border-b-2 px-3 py-2 text-sm transition-colors',
                  active
                    ? 'border-accent font-medium text-accent'
                    : 'border-transparent text-text-muted hover:border-border-strong hover:text-text',
                )}
              >
                {t.prefs[item.labelKey]}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
