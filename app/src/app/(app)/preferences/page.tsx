import type { EmployeeResponse, MeResponse } from '@sred/shared'

import { Card } from '@/components/Card'
import { serverApi } from '@/lib/api.server'

import { PreferencesNav } from './_components/PreferencesNav'
import { UserPreferencesForm } from './_components/UserPreferencesForm'

export const dynamic = 'force-dynamic'

export default async function UserPreferencesPage() {
  // First hop: get the session user (timezone, language, id).
  const { user } = await serverApi<MeResponse>('/preferences/user')
  // Second hop: load the full employee record so we can pre-fill `role`
  // (which isn't part of the lean SessionUser payload).
  const { employee } = await serverApi<EmployeeResponse>(
    `/employees/${user.id}`,
  )

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Preferences</h1>
        <p className="mt-2 text-base text-text-muted">
          Manage your account and your company settings.
        </p>
      </header>

      <PreferencesNav />

      <Card title="Your preferences">
        <UserPreferencesForm user={user} initialRole={employee.role} />
      </Card>
    </div>
  )
}
