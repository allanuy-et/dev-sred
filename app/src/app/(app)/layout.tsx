import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { AppShell } from '@/components/AppShell'
import { getCurrentUser } from '@/lib/auth.server'

export default async function AppLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return <AppShell user={user}>{children}</AppShell>
}
