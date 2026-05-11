import type { WeekSummary } from '@sred/shared'

import { formatLongDate, formatHours } from '@/lib/format'

export interface WeekHeroProps {
  companyName: string
  summary: WeekSummary
  tz: string
  locale: string
}

export function WeekHero({ companyName, summary, tz, locale }: WeekHeroProps) {
  const { totals, deltaFromPrevWeek } = summary
  const today = formatLongDate(new Date(), tz, locale)
  const internalHours = totals.hours - totals.sredHours

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight leading-tight">
          This week,{' '}
          <span className="text-text-muted">{companyName}</span> logged{' '}
          <span className="tabular-nums text-accent">
            {formatHours(totals.hours, locale)}
          </span>
          .
        </h1>
        <p className="mt-3 text-base text-text-muted">
          <span className="tabular-nums">
            {formatHours(totals.sredHours, locale)}
          </span>{' '}
          SR&amp;ED
          {internalHours > 0 ? (
            <>
              {' · '}
              <span className="tabular-nums">
                {formatHours(internalHours, locale)}
              </span>{' '}
              internal
            </>
          ) : null}
          {' · '}
          <DeltaLabel hours={deltaFromPrevWeek} locale={locale} />
        </p>
      </div>
      <p className="text-sm text-text-muted whitespace-nowrap">{today}</p>
    </header>
  )
}

function DeltaLabel({ hours, locale }: { hours: number; locale: string }) {
  if (hours === 0) {
    return <span>same as last week</span>
  }
  const direction = hours > 0 ? 'up' : 'down'
  const abs = Math.abs(hours)
  return (
    <span>
      {direction}{' '}
      <span className="tabular-nums">{formatHours(abs, locale)}</span> from last
      week
    </span>
  )
}
