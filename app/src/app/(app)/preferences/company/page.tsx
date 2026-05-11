import type { CompanyPreferencesResponse } from '@sred/shared'

import { Card } from '@/components/Card'
import { serverApi } from '@/lib/api.server'
import { getCurrentUser } from '@/lib/auth.server'

import { CompanyPreferencesForm } from '../_components/CompanyPreferencesForm'
import { PreferencesNav } from '../_components/PreferencesNav'

export const dynamic = 'force-dynamic'

export default async function CompanyPreferencesPage() {
  const [{ company }, user] = await Promise.all([
    serverApi<CompanyPreferencesResponse>('/preferences/company'),
    getCurrentUser(),
  ])

  if (!user) return null

  const canEdit = user.accessLevel === 'admin'

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Preferences</h1>
        <p className="mt-2 text-base text-text-muted">
          Manage your account and your company settings.
        </p>
      </header>

      <PreferencesNav />

      <Card title={company.name}>
        <CompanyPreferencesForm company={company} canEdit={canEdit} />
      </Card>
    </div>
  )
}
