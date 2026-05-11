import type { ReactNode, TableHTMLAttributes } from 'react'

function cn(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ')
}

export function Table({
  className,
  children,
  ...rest
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn('w-full text-sm', className)} {...rest}>
      {children}
    </table>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>
}

export function TR({
  children,
  className,
  interactive,
}: {
  children: ReactNode
  className?: string
  /** Apply a hover background — useful for rows that act as links. */
  interactive?: boolean
}) {
  return (
    <tr
      className={cn(
        interactive && 'hover:bg-surface-hover',
        'border-b border-border last:border-b-0',
        className,
      )}
    >
      {children}
    </tr>
  )
}

export function TH({
  children,
  className,
  align,
}: {
  children: ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-2 text-xs font-medium uppercase tracking-wide text-text-muted',
        align === 'right'
          ? 'text-right'
          : align === 'center'
            ? 'text-center'
            : 'text-left',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function TD({
  children,
  className,
  align,
}: {
  children: ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}) {
  return (
    <td
      className={cn(
        'px-4 py-3 align-middle',
        align === 'right'
          ? 'text-right'
          : align === 'center'
            ? 'text-center'
            : 'text-left',
        className,
      )}
    >
      {children}
    </td>
  )
}

export function EmptyTableState({ children }: { children: ReactNode }) {
  return (
    <div className="py-12 text-center text-sm text-text-muted">{children}</div>
  )
}
