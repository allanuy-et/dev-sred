import type { ReactNode } from 'react'

export type BadgeVariant = 'active' | 'concept' | 'info' | 'neutral'

const variants: Record<BadgeVariant, string> = {
  active: 'bg-green-50 text-success border-green-200',
  concept: 'bg-amber-50 text-warning border-amber-200',
  info: 'bg-accent-soft text-accent border-indigo-200',
  neutral: 'bg-surface-muted text-text-muted border-border',
}

function cn(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ')
}

export function Badge({
  variant = 'neutral',
  children,
  className,
}: {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
