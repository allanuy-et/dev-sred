import type { ReactNode } from 'react'

export interface CardProps {
  title?: ReactNode
  actions?: ReactNode
  /**
   * Compact padding — for sidebar cards and dense tables. Swaps `p-8` → `p-6`,
   * `mb-6` → `mb-4`, and title `text-lg` → `text-base`.
   */
  compact?: boolean
  className?: string
  children: ReactNode
}

function cn(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ')
}

export function Card({
  title,
  actions,
  compact,
  className,
  children,
}: CardProps) {
  return (
    <section
      className={cn(
        'rounded-lg border border-border bg-surface shadow-sm',
        compact ? 'p-6' : 'p-8',
        className,
      )}
    >
      {(title !== undefined || actions !== undefined) && (
        <header
          className={cn(
            'flex items-center justify-between gap-4',
            compact ? 'mb-4' : 'mb-6',
          )}
        >
          {title !== undefined ? (
            <h2
              className={cn(
                'font-semibold',
                compact ? 'text-base' : 'text-lg',
              )}
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          {actions !== undefined && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      {children}
    </section>
  )
}
