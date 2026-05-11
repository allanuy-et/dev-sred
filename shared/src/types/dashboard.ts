export interface DashboardStats {
  hoursThisWeek: number
  projectsCount: number
  projectsInSred: number
}

export type RecentActivityKind = 'labour' | 'project'

export interface RecentActivityItem {
  kind: RecentActivityKind
  id: string
  label: string
  ts: string
}

export interface RecentActivityResponse {
  activity: RecentActivityItem[]
}

// --- Week summary (powers the redesigned dashboard) ---

export interface DailyHoursBucket {
  /** ISO date `YYYY-MM-DD`, Monday-first, 7 entries total. */
  date: string
  hours: number
  sredHours: number
}

export interface ProjectPulseRow {
  projectId: string
  projectName: string
  projectType: 'sred' | 'internal'
  hours: number
}

export interface WeekSummaryTotals {
  hours: number
  sredHours: number
  projectsActive: number
}

export interface WeekSummary {
  /** Monday of this week, in the caller's timezone. ISO `YYYY-MM-DD`. */
  weekStart: string
  /** Always exactly 7 entries, Monday → Sunday. Zero-filled for days with no entries. */
  daily: DailyHoursBucket[]
  /** Top N projects this week, sorted by `hours` desc. */
  byProject: ProjectPulseRow[]
  totals: WeekSummaryTotals
  /** Hours this week minus hours last week. Positive = up. */
  deltaFromPrevWeek: number
}

export type WeekSummaryResponse = WeekSummary
