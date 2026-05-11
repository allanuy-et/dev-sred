import type { ReactNode, TableHTMLAttributes } from 'react'

import { ClickableRow } from './ClickableRow'

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
  // Barely-perceptible tint so the header reads as a distinct band without
  // overpowering the rows. Matches the reference table aesthetic.
  return <thead className="bg-surface-muted">{children}</thead>
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>
}

/**
 * Static table row. Used for non-list rows (totals, summary rows). For list
 * rows that navigate to a detail page, use {@link TRLink} so the entire row
 * is clickable + keyboard-accessible.
 */
export function TR({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <tr
      className={cn(
        'border-b border-border last:border-b-0',
        className,
      )}
    >
      {children}
    </tr>
  )
}

/**
 * Clickable table row that navigates to `href` on click, Enter, or Space.
 *
 * The first cell should still contain a real `<Link href={href}>` so:
 *   - SSR + crawlers can follow the link
 *   - keyboard / screen-reader users can right-click "Open in new tab"
 *   - the row's `role="link"` + `aria-label` carries semantic meaning
 *
 * Secondary actions inside the row (delete, dropdown) MUST wrap their handler
 * with `e.stopPropagation()` so the row navigation doesn't fight the action.
 */
export function TRLink({
  href,
  accessibleLabel,
  children,
  className,
}: {
  href: string
  accessibleLabel: string
  children: ReactNode
  className?: string
}) {
  return (
    <ClickableRow
      href={href}
      accessibleLabel={accessibleLabel}
      className={className}
    >
      {children}
    </ClickableRow>
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
        'px-4 py-3.5 text-xs font-medium uppercase tracking-wider text-text-muted',
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
        'px-4 py-5 align-middle',
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
