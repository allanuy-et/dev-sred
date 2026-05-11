import type { ReactNode } from 'react'

import { Card } from './Card'

export interface ListLayoutProps {
  /** Page title (h1). */
  title: string
  /** Optional subtitle / result count under the title. */
  subtitle?: ReactNode
  /** Filter controls rendered as a left-side Card on lg+ screens. */
  filters: ReactNode
  /** Toolbar content rendered above the table card (search bar + quick actions). */
  toolbar: ReactNode
  /** Main content — typically a `<Card>` wrapping a table. */
  children: ReactNode
}

/**
 * Two-column list layout used by /employees, /projects, /labour, /expenses.
 *
 * - Left column (`lg:` and up): filter Card, ~280px wide.
 * - Right column: toolbar (search + quick actions) above the main content Card.
 * - Below `lg`: filters stack above the main content so the table stays the
 *   first thing in the eye-path on mobile.
 *
 * Pairs with `<PageContainer>` going full-bleed on list routes — this layout
 * is the one that benefits from the extra horizontal space.
 */
export function ListLayout({
  title,
  subtitle,
  filters,
  toolbar,
  children,
}: ListLayoutProps) {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-sm text-text-muted">{subtitle}</p>
        ) : null}
      </header>

      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="order-2 lg:order-1">
          <Card compact title="Filters">{filters}</Card>
        </aside>

        <section className="order-1 lg:order-2 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {toolbar}
          </div>
          {children}
        </section>
      </div>
    </div>
  )
}
