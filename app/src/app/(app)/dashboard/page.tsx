import type {
  DashboardStats,
  RecentActivityItem,
  RecentActivityKind,
  RecentActivityResponse,
} from '@sred/shared'

import { Card } from '@/components/Card'
import { serverApi } from '@/lib/api.server'
import { getCurrentUser } from '@/lib/auth.server'
import { formatRelativeTime } from '@/lib/format'

const ACTIVITY_ICONS: Record<RecentActivityKind, string> = {
  labour: '◷',
  project: '▢',
}

async function loadDashboardData(): Promise<{
  stats: DashboardStats | null
  activity: RecentActivityItem[]
}> {
  // Tolerate one endpoint failing without breaking the whole page.
  const [statsRes, activityRes] = await Promise.allSettled([
    serverApi<DashboardStats>('/dashboard/stats'),
    serverApi<RecentActivityResponse>('/dashboard/recent-activity'),
  ])

  return {
    stats: statsRes.status === 'fulfilled' ? statsRes.value : null,
    activity:
      activityRes.status === 'fulfilled' ? activityRes.value.activity : [],
  }
}

export default async function DashboardPage() {
  const [user, data] = await Promise.all([
    getCurrentUser(),
    loadDashboardData(),
  ])

  // Layout already guards, but this satisfies TS and protects against races.
  if (!user) return null

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">
          Welcome, {user.firstName} {user.lastName}
        </h1>
        <p className="mt-2 text-sm text-text-muted">{today}</p>
      </header>

      <section className="grid gap-6 sm:grid-cols-2">
        <StatCard label="Hours this week" value={data.stats?.hoursThisWeek} />
        <StatCard
          label="Projects"
          value={data.stats?.projectsCount}
          helper={
            data.stats ? `${data.stats.projectsInSred} SR&ED` : undefined
          }
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Recent Activity">
            {data.activity.length === 0 ? (
              <div className="py-12 text-center text-sm text-text-muted">
                No activity yet.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {data.activity.map((item) => (
                  <li
                    key={`${item.kind}-${item.id}`}
                    className="flex items-center gap-3 py-3"
                  >
                    <span
                      aria-hidden
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg text-xs text-text-muted"
                    >
                      {ACTIVITY_ICONS[item.kind] ?? '•'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-text">{item.label}</p>
                    </div>
                    <time
                      dateTime={item.ts}
                      className="text-xs text-text-muted"
                    >
                      {formatRelativeTime(item.ts)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Hours by project">
          <div className="py-12 text-center text-sm text-text-muted">
            Chart coming soon.
          </div>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string
  value: number | undefined
  helper?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-10 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p className="mt-3 text-5xl font-semibold tracking-tight tabular-nums">
        {value ?? '—'}
      </p>
      {helper ? (
        <p className="mt-2 text-xs text-text-muted">{helper}</p>
      ) : null}
    </div>
  )
}
