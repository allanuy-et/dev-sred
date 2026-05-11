import type { ReactNode } from 'react'

export type BadgeVariant =
  | 'active'
  | 'concept'
  | 'info'
  | 'neutral'
  | 'danger'

// Pill-style status chips matching the reference table aesthetic — saturated
// pastel background with darker readable text, uppercase tracking. Use
// `active` for positive states, `concept`/`info` for in-progress / neutral,
// `danger` for offline / error states, and `neutral` for generic.
const variants: Record<BadgeVariant, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  concept: 'bg-amber-100 text-amber-800 border-amber-200',
  info: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  danger: 'bg-rose-100 text-rose-800 border-rose-200',
  neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200',
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
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
