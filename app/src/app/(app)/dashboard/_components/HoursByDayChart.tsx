'use client'

import { useState } from 'react'

import type { DailyHoursBucket } from '@sred/shared'

import { useFormatters } from '@/lib/timezone-context'

export interface HoursByDayChartProps {
  daily: DailyHoursBucket[]
  /** Today's date in the caller's timezone, as `YYYY-MM-DD`. Used to highlight the current column. */
  todayIso: string
}

const CHART_WIDTH = 640
const CHART_HEIGHT = 220
const PAD_TOP = 16
const PAD_RIGHT = 16
const PAD_BOTTOM = 40
const PAD_LEFT = 40
const BAR_RADIUS = 3

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function weekdayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return ''
  // Parse as UTC-midnight to avoid local-tz drift in the weekday calculation.
  const dt = new Date(Date.UTC(y, m - 1, d))
  return WEEKDAY_SHORT[dt.getUTCDay()] ?? ''
}

function dayOfMonth(isoDate: string): string {
  return isoDate.slice(8, 10).replace(/^0/, '')
}

export function HoursByDayChart({ daily, todayIso }: HoursByDayChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const { formatDate, formatHours } = useFormatters()

  // Y-axis scale: round up to next multiple of 4, with a floor of 8 so empty
  // weeks still render readable gridlines.
  const maxHours = Math.max(...daily.map((d) => d.hours), 0)
  const yMax = Math.max(8, Math.ceil(maxHours / 4) * 4)
  const gridSteps = yMax / 4
  const allZero = maxHours === 0

  const innerWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT
  const innerHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM
  const colWidth = innerWidth / daily.length
  const barWidth = Math.min(40, colWidth * 0.55)

  const xCol = (i: number) => PAD_LEFT + i * colWidth
  const xBar = (i: number) => xCol(i) + (colWidth - barWidth) / 2
  const yFor = (hours: number) =>
    PAD_TOP + innerHeight - (hours / yMax) * innerHeight
  const heightFor = (hours: number) => (hours / yMax) * innerHeight

  const hovered = hoveredIdx !== null ? daily[hoveredIdx] : null

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto"
        role="img"
        aria-label="Hours logged per day this week"
      >
        {/* Y-axis gridlines */}
        {Array.from({ length: gridSteps + 1 }, (_, i) => {
          const value = i * 4
          const y = yFor(value)
          return (
            <g key={value}>
              <line
                x1={PAD_LEFT}
                x2={CHART_WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth={value === 0 ? 1 : 1}
                strokeDasharray={value === 0 ? undefined : '2 4'}
              />
              <text
                x={PAD_LEFT - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-text-subtle text-[11px] tabular-nums"
              >
                {value}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {daily.map((d, i) => {
          const isToday = d.date === todayIso
          const isHovered = hoveredIdx === i
          const internal = Math.max(0, d.hours - d.sredHours)
          const sredH = heightFor(d.sredHours)
          const internalH = heightFor(internal)
          const sredY = yFor(d.sredHours)
          const internalY = yFor(d.hours)

          return (
            <g
              key={d.date}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onFocus={() => setHoveredIdx(i)}
              onBlur={() => setHoveredIdx(null)}
              tabIndex={0}
              role="img"
              aria-label={`${formatDate(d.date)}: ${formatHours(d.hours)} total, ${formatHours(d.sredHours)} SR&ED`}
              className="cursor-pointer focus:outline-none"
            >
              {/* Full-column hit area so hover doesn't disappear between bar and labels. */}
              <rect
                x={xCol(i)}
                y={PAD_TOP}
                width={colWidth}
                height={innerHeight + PAD_BOTTOM - 12}
                fill="transparent"
              />

              {/* Today's column highlight: subtle accent-soft background. */}
              {isToday ? (
                <rect
                  x={xCol(i) + 2}
                  y={PAD_TOP - 4}
                  width={colWidth - 4}
                  height={innerHeight + 8}
                  fill="var(--accent-soft)"
                  rx={6}
                />
              ) : null}

              {/* Internal hours (top of stack, neutral). */}
              {internal > 0 ? (
                <rect
                  x={xBar(i)}
                  y={internalY}
                  width={barWidth}
                  height={internalH}
                  fill="var(--text-subtle)"
                  opacity={isHovered ? 0.85 : 0.9}
                  rx={BAR_RADIUS}
                />
              ) : null}

              {/* SR&ED hours (bottom of stack, accent). */}
              {d.sredHours > 0 ? (
                <rect
                  x={xBar(i)}
                  y={sredY}
                  width={barWidth}
                  height={sredH}
                  fill="var(--accent)"
                  opacity={isHovered ? 0.9 : 1}
                  rx={BAR_RADIUS}
                />
              ) : null}

              {/* Weekday + day-of-month labels. */}
              <text
                x={xCol(i) + colWidth / 2}
                y={PAD_TOP + innerHeight + 18}
                textAnchor="middle"
                className={`text-xs ${isToday ? 'fill-accent font-medium' : 'fill-text-muted'}`}
              >
                {weekdayLabel(d.date)}
              </text>
              <text
                x={xCol(i) + colWidth / 2}
                y={PAD_TOP + innerHeight + 32}
                textAnchor="middle"
                className="fill-text-subtle text-[10px] tabular-nums"
              >
                {dayOfMonth(d.date)}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Empty-state overlay (centered, doesn't block focus). */}
      {allZero ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-text-muted">
            No labour logged yet this week.
          </p>
        </div>
      ) : null}

      {/* Tooltip — positioned in % of container width, no JS layout math. */}
      {hovered !== null && hoveredIdx !== null ? (
        <div
          className="absolute pointer-events-none rounded-md border border-border bg-surface shadow-md px-3 py-2 text-xs whitespace-nowrap"
          style={{
            left: `${((PAD_LEFT + hoveredIdx * colWidth + colWidth / 2) / CHART_WIDTH) * 100}%`,
            top: 0,
            transform: 'translate(-50%, -110%)',
          }}
        >
          <p className="font-medium text-text">{formatDate(hovered.date)}</p>
          <p className="mt-1 tabular-nums text-text-muted">
            {formatHours(hovered.hours)} total
          </p>
          {hovered.sredHours > 0 ? (
            <p className="tabular-nums text-accent">
              {formatHours(hovered.sredHours)} SR&amp;ED
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-5 text-xs text-text-muted">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: 'var(--accent)' }}
          />
          SR&amp;ED
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: 'var(--text-subtle)' }}
          />
          Internal
        </span>
      </div>
    </div>
  )
}
