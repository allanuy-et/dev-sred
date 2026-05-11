import type { ReactNode } from 'react'

export interface CardProps {
  title?: ReactNode
  actions?: ReactNode
  /**
   * Compact padding — for sidebar cards and dense tables. Swaps `p-10` → `p-8`,
   * `mb-8` → `mb-6`, and title `text-xl` → `text-lg`.
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
        compact ? 'p-8' : 'p-10',
        className,
      )}
    >
      {(title !== undefined || actions !== undefined) && (
        <header
          className={cn(
            'flex items-center justify-between gap-4',
            compact ? 'mb-6' : 'mb-8',
          )}
        >
          {title !== undefined ? (
            <h2
              className={cn(
                'font-semibold tracking-tight',
                compact ? 'text-lg' : 'text-xl',
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
