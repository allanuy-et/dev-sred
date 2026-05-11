import type { ReactNode } from 'react'

export interface ListLayoutProps {
  /** Page title (h1). */
  title: string
  /** Optional subtitle / result count under the title. */
  subtitle?: ReactNode
  /**
   * Toolbar row above the table — typically a `<SearchBar>` on the left,
   * inline filter controls (status, date range, etc.), and an "+ Add …"
   * action on the right.
   */
  toolbar: ReactNode
  /** Main content — typically a `<Card>` wrapping a table. */
  children: ReactNode
}

/**
 * Single-column list layout used by /employees, /projects, /labour, /expenses.
 *
 * - Header (title + result count)
 * - Toolbar row (search + inline filters + quick action)
 * - Main content (table Card)
 *
 * Toolbar wraps below `sm:` so mobile users see filters stack under the
 * search bar; everything fits on one line at `sm:` and up. Pairs with
 * `<PageContainer>`'s full-bleed width on list routes.
 */
export function ListLayout({
  title,
  subtitle,
  toolbar,
  children,
}: ListLayoutProps) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-sm text-text-muted">{subtitle}</p>
        ) : null}
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        {toolbar}
      </div>

      {children}
    </div>
  )
}
