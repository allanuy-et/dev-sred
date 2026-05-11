'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Width-adaptive container that wraps every page rendered inside the
 * authenticated app shell. Most pages get the standard `max-w-[1360px]`
 * reading width; list pages drop the constraint and use the full viewport
 * so the table + filter sidebar can breathe.
 */

// Exact-match list routes that go full-bleed. Detail routes like
// `/employees/[id]` keep the standard reading width.
const WIDE_PATHS = new Set<string>([
  '/employees',
  '/projects',
  '/labour',
  '/expenses',
])

export function PageContainer({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  const isWide = WIDE_PATHS.has(pathname)
  return (
    <div
      className={
        isWide
          ? 'w-full px-8 py-10 lg:px-12 lg:py-12'
          : 'mx-auto w-full max-w-[1360px] px-8 py-10 lg:px-16 lg:py-16'
      }
    >
      {children}
    </div>
  )
}
