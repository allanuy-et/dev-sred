'use client'

import { createContext, useContext, type ReactNode } from 'react'

import { getMessages, type Messages } from './i18n'

/**
 * Client-only message catalog context. Set once in `<AppShell>` from the
 * session user's `language` — every Client Component reads its UI strings via
 * `useMessages()` instead of holding literals.
 *
 * Server Components do *not* read from this context — they import
 * `getMessages(user.language)` directly when they need a localized string.
 */
const I18nContext = createContext<Messages | null>(null)

export function I18nProvider({
  locale,
  children,
}: {
  locale: string
  children: ReactNode
}) {
  return (
    <I18nContext.Provider value={getMessages(locale)}>
      {children}
    </I18nContext.Provider>
  )
}

/** Get the active message catalog. Throws if used outside `<I18nProvider>`. */
export function useMessages(): Messages {
  const m = useContext(I18nContext)
  if (!m) {
    throw new Error('useMessages must be used inside <I18nProvider>')
  }
  return m
}
