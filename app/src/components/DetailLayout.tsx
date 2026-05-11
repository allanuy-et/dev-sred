import type { ReactNode } from 'react'

export type AsidePosition = 'left' | 'right'

export interface DetailLayoutProps {
  /**
   * Content of the related/aside column. On `lg:` and above this sits at a
   * fixed 320px width on the side indicated by `asidePosition`. Below `lg:`
   * it stacks **below** the main content.
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
  /**
   * Which side the aside sits on at `lg:` and up.
   * - `'left'` (default): aside-left, main-right. Used on the employee view.
   * - `'right'`: aside-right, main-left. Used on the project view where the
   *   related labour / expenses lists feel like an inspector panel.
   */
  asidePosition?: AsidePosition
}

/**
 * Two-column "detail with related content" layout. Below `lg:` the layout
 * stacks with the main content first so mobile users hit the primary detail
 * before the related-content lists.
 */
export function DetailLayout({
  aside,
  children,
  asidePosition = 'left',
}: DetailLayoutProps) {
  const gridCls =
    asidePosition === 'right'
      ? 'grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]'
      : 'grid grid-cols-1 gap-10 lg:grid-cols-[320px_minmax(0,1fr)]'

  // On `lg:` the main column always renders first when aside is on the right,
  // and second when aside is on the left. Below `lg:` main is always first.
  const asideLgOrder = asidePosition === 'right' ? 'lg:order-2' : 'lg:order-1'
  const mainLgOrder = asidePosition === 'right' ? 'lg:order-1' : 'lg:order-2'

  return (
    <div className={gridCls}>
      <aside className={`order-2 space-y-8 ${asideLgOrder}`}>{aside}</aside>
      <div className={`order-1 space-y-8 ${mainLgOrder}`}>{children}</div>
    </div>
  )
}
