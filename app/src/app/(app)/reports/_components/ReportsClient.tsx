'use client'

import { useState } from 'react'

import type {
  MonthlyReportResponse,
  ProjectType,
  ReportMonthRow,
  ReportProjectRow,
  ReportTotals,
  YearlyReportResponse,
} from '@sred/shared'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { SelectField } from '@/components/Field'
import {
  EmptyTableState,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@/components/Table'
import { ApiError } from '@/lib/api'
import { clientApi } from '@/lib/api.client'
import { formatCurrency, formatHours } from '@/lib/format'
import { PROJECT_TYPE_LABELS } from '@/lib/project-labels'

interface ProjectOption {
  id: string
  label: string
}

type ReportView = 'monthly' | 'yearly'
type TypeFilter = 'all' | ProjectType

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

interface ReportsClientProps {
  projects: ProjectOption[]
}

interface MonthlyResult {
  view: 'monthly'
  data: MonthlyReportResponse
  /** Snapshot of filters used when generating, for the header. */
  filters: { year: number; month: number; projectId: string; type: TypeFilter }
}
interface YearlyResult {
  view: 'yearly'
  data: YearlyReportResponse
  filters: { year: number; projectId: string; type: TypeFilter }
}
type Result = MonthlyResult | YearlyResult

function currentYear(): number {
  return new Date().getFullYear()
}
function currentMonth(): number {
  return new Date().getMonth() + 1
}

function yearOptions(): number[] {
  const now = currentYear()
  return Array.from({ length: 7 }, (_, i) => now - i)
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '' || v === null) continue
    search.set(k, String(v))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function ReportsClient({ projects }: ReportsClientProps) {
  const [view, setView] = useState<ReportView>('monthly')
  const [projectId, setProjectId] = useState<string>('')
  const [type, setType] = useState<TypeFilter>('all')
  const [year, setYear] = useState<number>(currentYear())
  const [month, setMonth] = useState<number>(currentMonth())

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (view === 'monthly') {
        const qs = buildQuery({
          year,
          month,
          projectId: projectId || undefined,
          type: type === 'all' ? undefined : type,
        })
        const data = await clientApi<MonthlyReportResponse>(
          `/reports/monthly${qs}`,
        )
        setResult({
          view: 'monthly',
          data,
          filters: { year, month, projectId, type },
        })
      } else {
        const qs = buildQuery({
          year,
          projectId: projectId || undefined,
          type: type === 'all' ? undefined : type,
        })
        const data = await clientApi<YearlyReportResponse>(
          `/reports/yearly${qs}`,
        )
        setResult({
          view: 'yearly',
          data,
          filters: { year, projectId, type },
        })
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Please sign in again.')
      } else if (err instanceof ApiError && err.status === 400) {
        setError('Please double-check the report filters.')
      } else {
        setError('Could not generate the report. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <Card className="no-print">
        <div className="mb-6 flex items-center gap-1 border-b border-border">
          <TabButton
            active={view === 'monthly'}
            onClick={() => setView('monthly')}
          >
            Monthly
          </TabButton>
          <TabButton
            active={view === 'yearly'}
            onClick={() => setView('yearly')}
          >
            Yearly
          </TabButton>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField
              label="Project"
              value={projectId}
              onChange={(e) => setProjectId(e.currentTarget.value)}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </SelectField>

            <fieldset className="flex flex-col gap-1">
              <legend className="text-xs font-medium text-text-muted">
                Project Type
              </legend>
              <div className="flex h-[34px] items-center gap-4 text-sm">
                {(['all', 'sred', 'internal'] as const).map((v) => (
                  <label
                    key={v}
                    className="inline-flex items-center gap-1.5 text-text"
                  >
                    <input
                      type="radio"
                      name="report-type"
                      value={v}
                      checked={type === v}
                      onChange={() => setType(v)}
                      className="accent-accent"
                    />
                    <span>
                      {v === 'all' ? 'All' : PROJECT_TYPE_LABELS[v]}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {view === 'monthly' ? (
              <SelectField
                label="Month"
                value={String(month)}
                onChange={(e) => setMonth(Number(e.currentTarget.value))}
              >
                {MONTH_LABELS.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </SelectField>
            ) : null}

            <SelectField
              label="Year"
              value={String(year)}
              onChange={(e) => setYear(Number(e.currentTarget.value))}
            >
              {yearOptions().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </SelectField>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-danger"
            >
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            {result ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => window.print()}
              >
                Print
              </Button>
            ) : null}
            <Button type="submit" disabled={loading}>
              {loading ? 'Generating…' : 'Generate Report'}
            </Button>
          </div>
        </form>
      </Card>

      {result ? <ReportResult result={result} projects={projects} /> : null}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px inline-flex items-center border-b-2 px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'border-accent font-medium text-text'
          : 'border-transparent text-text-muted hover:text-text'
      }`}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}

function ReportResult({
  result,
  projects,
}: {
  result: Result
  projects: ProjectOption[]
}) {
  const projectLabel =
    projects.find((p) => p.id === result.filters.projectId)?.label ??
    'All projects'
  const typeLabel =
    result.filters.type === 'all'
      ? 'All types'
      : PROJECT_TYPE_LABELS[result.filters.type]

  const heading =
    result.view === 'monthly'
      ? `${MONTH_LABELS[result.filters.month - 1]} ${result.filters.year}`
      : `${result.filters.year}`

  return (
    <Card>
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{heading}</h2>
          <p className="text-xs text-text-muted">
            {projectLabel} · {typeLabel}
          </p>
        </div>
      </header>

      {result.view === 'monthly' ? (
        <MonthlyTable rows={result.data.rows} totals={result.data.totals} />
      ) : (
        <YearlyTable rows={result.data.rows} totals={result.data.totals} />
      )}
    </Card>
  )
}

function MonthlyTable({
  rows,
  totals,
}: {
  rows: ReportProjectRow[]
  totals: ReportTotals
}) {
  if (rows.length === 0) {
    return (
      <EmptyTableState>No labour or expenses recorded for these filters.</EmptyTableState>
    )
  }
  return (
    <Table>
      <THead>
        <TR>
          <TH>Project</TH>
          <TH>Type</TH>
          <TH align="right">Hours</TH>
          <TH align="right">Cost</TH>
          <TH align="right">SR&amp;ED Hours</TH>
          <TH align="right">SR&amp;ED Cost</TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.projectId}>
            <TD>{row.projectName}</TD>
            <TD>{PROJECT_TYPE_LABELS[row.projectType]}</TD>
            <TD align="right" className="tabular-nums">
              {formatHours(row.hours)}
            </TD>
            <TD align="right" className="tabular-nums">
              {formatCurrency(row.cost)}
            </TD>
            <TD align="right" className="tabular-nums">
              {formatHours(row.sredHours)}
            </TD>
            <TD align="right" className="tabular-nums">
              {formatCurrency(row.sredCost)}
            </TD>
          </TR>
        ))}
        <TotalsRow totals={totals} leadingCols={2} />
      </TBody>
    </Table>
  )
}

function YearlyTable({
  rows,
  totals,
}: {
  rows: ReportMonthRow[]
  totals: ReportTotals
}) {
  // Always render 12 rows. Backfill missing months with zeros.
  const byMonth = new Map(rows.map((r) => [r.month, r]))
  const padded: ReportMonthRow[] = MONTH_LABELS.map((_, i) => {
    const m = i + 1
    return (
      byMonth.get(m) ?? {
        month: m,
        hours: 0,
        cost: 0,
        sredHours: 0,
        sredCost: 0,
      }
    )
  })
  return (
    <Table>
      <THead>
        <TR>
          <TH>Month</TH>
          <TH align="right">Hours</TH>
          <TH align="right">Cost</TH>
          <TH align="right">SR&amp;ED Hours</TH>
          <TH align="right">SR&amp;ED Cost</TH>
        </TR>
      </THead>
      <TBody>
        {padded.map((row) => (
          <TR key={row.month}>
            <TD>{MONTH_LABELS[row.month - 1]}</TD>
            <TD align="right" className="tabular-nums">
              {formatHours(row.hours)}
            </TD>
            <TD align="right" className="tabular-nums">
              {formatCurrency(row.cost)}
            </TD>
            <TD align="right" className="tabular-nums">
              {formatHours(row.sredHours)}
            </TD>
            <TD align="right" className="tabular-nums">
              {formatCurrency(row.sredCost)}
            </TD>
          </TR>
        ))}
        <TotalsRow totals={totals} leadingCols={1} />
      </TBody>
    </Table>
  )
}

function TotalsRow({
  totals,
  leadingCols,
}: {
  totals: ReportTotals
  leadingCols: number
}) {
  return (
    <TR className="bg-surface-hover font-medium">
      <TD className="font-medium">Total</TD>
      {Array.from({ length: leadingCols - 1 }).map((_, i) => (
        <TD key={i}>{null}</TD>
      ))}
      <TD align="right" className="tabular-nums">
        {formatHours(totals.hours)}
      </TD>
      <TD align="right" className="tabular-nums">
        {formatCurrency(totals.cost)}
      </TD>
      <TD align="right" className="tabular-nums">
        {formatHours(totals.sredHours)}
      </TD>
      <TD align="right" className="tabular-nums">
        {formatCurrency(totals.sredCost)}
      </TD>
    </TR>
  )
}
