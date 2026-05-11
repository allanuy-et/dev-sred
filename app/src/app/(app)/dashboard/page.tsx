import type {
  CompanyPreferencesResponse,
  RecentActivityResponse,
  WeekSummaryResponse,
} from '@sred/shared'

import { Card } from '@/components/Card'
import { serverApi } from '@/lib/api.server'
import { getCurrentUser } from '@/lib/auth.server'
import { getIntlLocale } from '@/lib/i18n'

import {
  loadEmployees,
  loadProjects,
} from '../labour/_lib/selectOptions'
import { ActivityTimeline } from './_components/ActivityTimeline'
import { HoursByDayChart } from './_components/HoursByDayChart'
import { PulseCard } from './_components/PulseCard'
import { QuickActions } from './_components/QuickActions'
import { WeekHero } from './_components/WeekHero'

async function loadDashboardData() {
  // Each fetch can fail independently — the dashboard degrades gracefully
  // rather than 500ing the whole page if one endpoint is down.
  const [summaryRes, activityRes, companyRes] = await Promise.allSettled([
    serverApi<WeekSummaryResponse>('/dashboard/week-summary'),
    serverApi<RecentActivityResponse>('/dashboard/recent-activity'),
    serverApi<CompanyPreferencesResponse>('/preferences/company'),
  ])
  return {
    summary: summaryRes.status === 'fulfilled' ? summaryRes.value : null,
    activity:
      activityRes.status === 'fulfilled' ? activityRes.value.activity : [],
    company:
      companyRes.status === 'fulfilled' ? companyRes.value.company : null,
  }
}

// Returns today's date as `YYYY-MM-DD` in the given timezone.
function isoInTz(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export default async function DashboardPage() {
  const [user, data, employees, projects] = await Promise.all([
    getCurrentUser(),
    loadDashboardData(),
    loadEmployees('active'),
    loadProjects('active'),
  ])

  if (!user) return null
  const locale = getIntlLocale(user.language)

  // Hero needs a summary; if the week-summary endpoint failed, fall back to a
  // minimal banner instead of the rich hero.
  if (!data.summary) {
    return (
      <div className="space-y-8">
        <h1 className="text-4xl font-semibold tracking-tight">Dashboard</h1>
        <Card>
          <p className="text-sm text-text-muted">
            We couldn&rsquo;t load this week&rsquo;s summary. Try refreshing.
          </p>
        </Card>
      </div>
    )
  }

  const companyName = data.company?.name ?? 'your team'
  const todayIso = isoInTz(user.timezone)

  return (
    <div className="space-y-12">
      <WeekHero
        companyName={companyName}
        summary={data.summary}
        tz={user.timezone}
        locale={locale}
        actions={
          <QuickActions
            employees={employees}
            projects={projects}
            parentProjects={projects}
            lockedToEmployeeId={
              user.accessLevel === 'standard' ? user.id : undefined
            }
          />
        }
      />

      <Card title="Hours by day">
        <HoursByDayChart daily={data.summary.daily} todayIso={todayIso} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <PulseCard
            byProject={data.summary.byProject}
            byEmployee={data.summary.byEmployee}
            totalHours={data.summary.totals.hours}
            locale={locale}
          />
        </div>
        <div className="lg:col-span-2">
          <Card title="Activity">
            <ActivityTimeline
              activity={data.activity}
              tz={user.timezone}
              locale={locale}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
