import Link from 'next/link'
import { notFound } from 'next/navigation'

import type {
  ExpenseListResponse,
  ExpenseWithRelations,
  LabourEntryWithRelations,
  LabourListResponse,
  Project,
  ProjectResponse,
} from '@sred/shared'

import { BackChevron } from '@/components/BackChevron'
import { Card } from '@/components/Card'
import { ExpenseFormDialog } from '@/components/dialogs/ExpenseFormDialog'
import { LabourFormDialog } from '@/components/dialogs/LabourFormDialog'
import { ApiError } from '@/lib/api'
import { serverApi } from '@/lib/api.server'
import { getCurrentUser } from '@/lib/auth.server'
import { EXPENSE_TYPE_LABELS } from '@/lib/expense-labels'
import { formatCurrency, formatDate, formatHours } from '@/lib/format'
import { getIntlLocale } from '@/lib/i18n'
import { LABOUR_TYPE_LABELS } from '@/lib/labour-labels'

import {
  loadEmployees,
  loadProjects,
  type SelectOption,
} from '../../labour/_lib/selectOptions'
import { ProjectDetail } from './_components/ProjectDetail'

const RECENT_LIMIT = 8

async function loadProject(id: string): Promise<Project | null> {
  try {
    const { project } = await serverApi<ProjectResponse>(`/projects/${id}`)
    return project
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

async function loadRecentLabour(
  projectId: string,
): Promise<LabourEntryWithRelations[]> {
  try {
    const { entries } = await serverApi<LabourListResponse>(
      `/labour?projectId=${projectId}&limit=${RECENT_LIMIT}`,
    )
    return entries
  } catch {
    return []
  }
}

async function loadRecentExpenses(
  projectId: string,
): Promise<ExpenseWithRelations[]> {
  try {
    const { entries } = await serverApi<ExpenseListResponse>(
      `/expenses?projectId=${projectId}&limit=${RECENT_LIMIT}`,
    )
    return entries
  } catch {
    return []
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [project, employees, allProjects, currentUser] = await Promise.all([
    loadProject(id),
    // Pass 'all' so a deactivated manager/parent that's still referenced by
    // this project stays in the edit dropdown — otherwise saving silently
    // drops the assignment.
    loadEmployees('all'),
    loadProjects('all'),
    getCurrentUser(),
  ])

  if (!project) notFound()
  if (!currentUser) return null

  const tz = currentUser.timezone
  const locale = getIntlLocale(currentUser.language)

  // Fetch related records once we know the project is real.
  const [labour, expenses] = await Promise.all([
    loadRecentLabour(project.id),
    loadRecentExpenses(project.id),
  ])

  // A project cannot be its own parent.
  const parentOptions = allProjects.filter((p) => p.id !== project.id)

  const aside = (
    <>
      <RecentLabourCard
        projectId={project.id}
        entries={labour}
        tz={tz}
        locale={locale}
        employees={employees}
        projects={allProjects}
      />
      <RecentExpensesCard
        projectId={project.id}
        entries={expenses}
        tz={tz}
        locale={locale}
        employees={employees}
        projects={allProjects}
      />
    </>
  )

  return (
    <div className="space-y-12">
      <header className="flex items-center gap-3">
        <BackChevron href="/projects" label="Back to projects" />
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {project.type === 'sred' ? 'SR&ED' : 'Internal'} project
          </p>
        </div>
      </header>

      <ProjectDetail
        project={project}
        employees={employees}
        parentProjects={parentOptions}
        aside={aside}
      />
    </div>
  )
}

function RecentLabourCard({
  projectId,
  entries,
  tz,
  locale,
  employees,
  projects,
}: {
  projectId: string
  entries: LabourEntryWithRelations[]
  tz: string
  locale: string
  employees: SelectOption[]
  projects: SelectOption[]
}) {
  return (
    <Card
      compact
      title="Recent labour"
      actions={
        <Link
          href={`/labour?projectId=${projectId}`}
          className="text-xs font-medium text-accent hover:underline"
        >
          View all
        </Link>
      }
    >
      {entries.length === 0 ? (
        <p className="text-xs text-text-muted">
          No labour entries for this project yet.
        </p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
            >
              <Link
                href={`/labour/${entry.id}`}
                className="min-w-0 flex-1 hover:underline"
              >
                <div className="text-xs font-medium text-text-muted">
                  {formatDate(entry.date, tz, locale)}
                </div>
                <div className="truncate text-sm text-text">
                  {entry.employeeName}
                </div>
                <div className="text-xs text-text-muted">
                  {LABOUR_TYPE_LABELS[entry.labourType]}
                </div>
              </Link>
              <span className="shrink-0 text-sm tabular-nums text-text">
                {formatHours(entry.hours, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 border-t border-border pt-3">
        <LabourFormDialog
          triggerLabel="+ Add labour"
          triggerVariant="secondary"
          triggerSize="sm"
          employees={employees}
          projects={projects}
          presetProjectId={projectId}
        />
      </div>
    </Card>
  )
}

function RecentExpensesCard({
  projectId,
  entries,
  tz,
  locale,
  employees,
  projects,
}: {
  projectId: string
  entries: ExpenseWithRelations[]
  tz: string
  locale: string
  employees: SelectOption[]
  projects: SelectOption[]
}) {
  return (
    <Card
      compact
      title="Recent expenses"
      actions={
        <Link
          href={`/expenses?projectId=${projectId}`}
          className="text-xs font-medium text-accent hover:underline"
        >
          View all
        </Link>
      }
    >
      {entries.length === 0 ? (
        <p className="text-xs text-text-muted">
          No expenses for this project yet.
        </p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
            >
              <Link
                href={`/expenses/${entry.id}`}
                className="min-w-0 flex-1 hover:underline"
              >
                <div className="text-xs font-medium text-text-muted">
                  {formatDate(entry.date, tz, locale)}
                </div>
                <div className="truncate text-sm text-text">
                  {entry.employeeName}
                </div>
                <div className="text-xs text-text-muted">
                  {EXPENSE_TYPE_LABELS[entry.type]}
                </div>
              </Link>
              <span className="shrink-0 text-sm tabular-nums text-text">
                {formatCurrency(entry.cost, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 border-t border-border pt-3">
        <ExpenseFormDialog
          triggerLabel="+ Add expense"
          triggerVariant="secondary"
          triggerSize="sm"
          employees={employees}
          projects={projects}
          presetProjectId={projectId}
        />
      </div>
    </Card>
  )
}
