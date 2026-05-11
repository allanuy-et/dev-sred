import Link from 'next/link'

export interface BackChevronProps {
  /** Where the back link points. */
  href: string
  /** Accessible label for the icon button. */
  label: string
}

/**
 * Standard "back" affordance used on every detail / new page — chevron-left
 * icon button, sized as a 36px hit target, sitting immediately to the left
 * of the page title. Replaces the older "← Back to {entity}" text link.
 */
export function BackChevron({ href, label }: BackChevronProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </Link>
  )
}
