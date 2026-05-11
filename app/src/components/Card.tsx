import type { ReactNode } from 'react'

export interface CardProps {
  title?: ReactNode
  actions?: ReactNode
  /** Use compact padding (`p-4` instead of `p-6`). */
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
        compact ? 'p-4' : 'p-6',
        className,
      )}
    >
      {(title !== undefined || actions !== undefined) && (
        <header className="mb-4 flex items-center justify-between gap-4">
          {title !== undefined ? (
            <h2 className="text-base font-medium">{title}</h2>
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
