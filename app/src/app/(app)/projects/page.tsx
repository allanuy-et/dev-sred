import Link from 'next/link'

import type {
  EmployeeListResponse,
  ProjectListResponse,
  User,
} from '@sred/shared'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { StatusFilter } from '@/components/StatusFilter'
import {
  EmptyTableState,
  TBody,
  TD,
  TH,
  THead,
  TR,
  TRLink,
  Table,
} from '@/components/Table'
import { serverApi } from '@/lib/api.server'
import { formatDate } from '@/lib/format'
import { PROJECT_PHASE_LABELS } from '@/lib/project-labels'
import { parseStatusFilter } from '@/lib/status-filter'

function managerName(user: User | undefined): string {
  if (!user) return '—'
  return `${user.firstName} ${user.lastName}`
}

export default async function ProjectsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: rawStatus } = await searchParams
  const status = parseStatusFilter(rawStatus)

  const [{ projects }, { employees }] = await Promise.all([
    serverApi<ProjectListResponse>(`/projects?status=${status}`),
    // Employees are needed to render the Manager column. Default = active only,
    // which is fine — we just need a lookup map for IDs that appear on rows.
    serverApi<EmployeeListResponse>('/employees?status=all'),
  ])

  const employeeById = new Map(employees.map((e) => [e.id, e]))

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-text-muted">
            {projects.length}{' '}
            {projects.length === 1 ? 'project' : 'projects'} shown.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusFilter value={status} />
          <Link href="/projects/new">
            <Button>+ Add Project</Button>
          </Link>
        </div>
      </header>

      <Card>
        {projects.length === 0 ? (
          <EmptyTableState>
            No projects match this filter.{' '}
            <Link
              href="/projects/new"
              className="font-medium text-accent hover:underline"
            >
              Add one
            </Link>{' '}
            to get started.
          </EmptyTableState>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Phase</TH>
                <TH>Start Date</TH>
                <TH>Due Date</TH>
                <TH>Manager</TH>
              </TR>
            </THead>
            <TBody>
              {projects.map((p) => (
                <TRLink
                  key={p.id}
                  href={`/projects/${p.id}`}
                  accessibleLabel={`View project ${p.name}`}
                >
                  <TD>
                    <Link
                      href={`/projects/${p.id}`}
                      className="inline-flex items-center gap-1.5 font-medium text-text hover:underline"
                    >
                      {p.type === 'sred' ? (
                        <span
                          aria-label="SR&ED project"
                          title="SR&ED project"
                          className="text-warning"
                        >
                          +
                        </span>
                      ) : null}
                      {p.name}
                    </Link>
                  </TD>
                  <TD>{PROJECT_PHASE_LABELS[p.phase]}</TD>
                  <TD>{formatDate(p.startDate)}</TD>
                  <TD>{formatDate(p.dueDate)}</TD>
                  <TD>
                    {p.projectManagerId
                      ? managerName(employeeById.get(p.projectManagerId))
                      : '—'}
                  </TD>
                </TRLink>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
