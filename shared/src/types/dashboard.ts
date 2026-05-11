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
