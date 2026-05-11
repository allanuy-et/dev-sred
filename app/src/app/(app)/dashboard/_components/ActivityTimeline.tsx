import type { RecentActivityItem, RecentActivityKind } from '@sred/shared'

import { formatRelativeTime } from '@/lib/format'

const ACTIVITY_DOT_CLASS: Record<RecentActivityKind, string> = {
  labour: 'bg-accent',
  project: 'bg-warning',
}

export interface ActivityTimelineProps {
  activity: RecentActivityItem[]
  tz: string
  locale: string
}

interface ActivityGroup {
  label: string
  items: RecentActivityItem[]
}

function groupByDay(
  activity: RecentActivityItem[],
  tz: string,
): ActivityGroup[] {
  // Bucket by YYYY-MM-DD in the caller's tz. Labels are tagged "Today" /
  // "Yesterday" / weekday for the most-recent groupings, else short date.
  const now = new Date()
  const todayKey = isoInTz(now, tz)
  const yesterdayKey = isoInTz(new Date(now.getTime() - 86_400_000), tz)

  const buckets = new Map<string, RecentActivityItem[]>()
  for (const item of activity) {
    const key = isoInTz(new Date(item.ts), tz)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(item)
    else buckets.set(key, [item])
  }

  // Map.entries preserves insertion order; activity arrives newest-first so
  // we get newest-day-first groups for free.
  return [...buckets.entries()].map(([key, items]) => {
    let label: string
    if (key === todayKey) label = 'Today'
    else if (key === yesterdayKey) label = 'Yesterday'
    else label = niceDate(key)
    return { label, items }
  })
}

function isoInTz(date: Date, tz: string): string {
  // en-CA gives YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function niceDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const dt = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(dt)
}

export function ActivityTimeline({
  activity,
  tz,
  locale,
}: ActivityTimelineProps) {
  if (activity.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-text-muted">
        No recent activity.
      </div>
    )
  }

  const groups = groupByDay(activity, tz)

  return (
    <ol className="relative pl-6">
      {/* Vertical rail */}
      <span
        aria-hidden
        className="absolute left-2 top-1 bottom-1 w-px bg-border"
      />
      {groups.map((group) => (
        <li key={group.label} className="mb-6 last:mb-0">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-subtle">
            {group.label}
          </p>
          <ul className="space-y-3">
            {group.items.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="relative">
                <span
                  aria-hidden
                  className={`absolute -left-[18px] top-[6px] h-2 w-2 rounded-full ${ACTIVITY_DOT_CLASS[item.kind] ?? 'bg-text-muted'} ring-2 ring-surface`}
                />
                <p className="text-sm text-text leading-snug">{item.label}</p>
                <time
                  dateTime={item.ts}
                  className="text-xs text-text-muted tabular-nums"
                >
                  {formatRelativeTime(item.ts, tz, locale)}
                </time>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}
