import type { ProjectType } from './project.js'

export interface ReportTotals {
  hours: number
  cost: number
  sredHours: number
  sredCost: number
}

export interface ReportProjectRow {
  projectId: string
  projectName: string
  projectType: ProjectType
  hours: number
  cost: number
  sredHours: number
  sredCost: number
}

export interface ReportMonthRow {
  month: number
  hours: number
  cost: number
  sredHours: number
  sredCost: number
}

export interface MonthlyReportResponse {
  rows: ReportProjectRow[]
  totals: ReportTotals
}

export interface YearlyReportResponse {
  rows: ReportMonthRow[]
  totals: ReportTotals
}
