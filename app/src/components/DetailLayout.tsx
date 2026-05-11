import type { ReactNode } from 'react'

export interface DetailLayoutProps {
  /**
   * Content of the related/aside column. On `lg:` and above this sits on the
   * **left** at a fixed 280px width (per design-system.md). Below `lg:` it
   * stacks **below** the main content.
   *
   * Aside cards should typically use the compact Card variant (`<Card compact>`)
   * to match the lighter visual weight of sidebar panels.
   */
  aside: ReactNode
  /**
   * Primary detail content (the "main" column). Flexes to fill the remaining
   * width on `lg:` and above; on mobile stacks first.
   */
  children: ReactNode
}

/**
 * Two-column "detail with related content" layout used on detail pages where
 * there's primary info **and** related/recent records — e.g. Employee view
 * (with recent labour / recent expenses) or Project view (with the narrative
 * generator).
 *
 * Per explicit user direction the aside sits on the **left** on `lg:` and up
 * with the main content on the **right**. Below `lg:` the layout stacks with
 * the main content first so mobile users hit the primary detail before the
 * related-content lists.
 */
export function DetailLayout({ aside, children }: DetailLayoutProps) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="order-2 space-y-6 lg:order-1">{aside}</aside>
      <div className="order-1 space-y-6 lg:order-2">{children}</div>
    </div>
  )
}
