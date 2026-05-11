import type { ProjectType } from './project.js'

// `cost` = expense cost (legacy name kept for backward-compat).
// `labourCost` = hours * rate-effective-on-each-entry-date.
// `totalCost` = `cost` + `labourCost`.
export interface ReportTotals {
  hours: number
  cost: number
  labourCost: number
  totalCost: number
  sredHours: number
  sredCost: number
  sredLabourCost: number
  sredTotalCost: number
}

export interface ReportProjectRow {
  projectId: string
  projectName: string
  projectType: ProjectType
  hours: number
  cost: number
  labourCost: number
  totalCost: number
  sredHours: number
  sredCost: number
  sredLabourCost: number
  sredTotalCost: number
}

export interface ReportMonthRow {
  month: number
  hours: number
  cost: number
  labourCost: number
  totalCost: number
  sredHours: number
  sredCost: number
  sredLabourCost: number
  sredTotalCost: number
}

export interface MonthlyReportResponse {
  rows: ReportProjectRow[]
  totals: ReportTotals
}

export interface YearlyReportResponse {
  rows: ReportMonthRow[]
  totals: ReportTotals
}
