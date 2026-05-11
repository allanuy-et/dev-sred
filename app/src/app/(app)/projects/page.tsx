import Link from 'next/link'

import type {
  EmployeeListResponse,
  ProjectListResponse,
  User,
} from '@sred/shared'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ListLayout } from '@/components/ListLayout'
import {
  ProjectTypeFilter,
  type ProjectTypeFilterValue,
} from '@/components/ProjectTypeFilter'
import { SearchBar } from '@/components/SearchBar'
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
import { getCurrentUser } from '@/lib/auth.server'
import { formatDate } from '@/lib/format'
import { getIntlLocale } from '@/lib/i18n'
import { PROJECT_PHASE_LABELS } from '@/lib/project-labels'
import { parseStatusFilter } from '@/lib/status-filter'

function managerName(user: User | undefined): string {
  if (!user) return '—'
  return `${user.firstName} ${user.lastName}`
}

function parseTypeFilter(raw: string | undefined): ProjectTypeFilterValue {
  if (raw === 'sred' || raw === 'internal') return raw
  return 'all'
}

export default async function ProjectsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>
}) {
  const {
    status: rawStatus,
    type: rawType,
    q: rawQ,
  } = await searchParams
  const status = parseStatusFilter(rawStatus)
  const typeFilter = parseTypeFilter(rawType)
  const q = typeof rawQ === 'string' ? rawQ : ''

  const params = new URLSearchParams({ status })
  if (q.trim().length >= 2) params.set('q', q.trim())

  // The backend list endpoint doesn't take ?type= yet; we filter after the
  // fetch. The data set is small enough this is a non-issue.
  const [{ projects: allProjects }, { employees }, currentUser] = await Promise.all([
    serverApi<ProjectListResponse>(`/projects?${params.toString()}`),
    serverApi<EmployeeListResponse>('/employees?status=all'),
    getCurrentUser(),
  ])

  if (!currentUser) return null
  const tz = currentUser.timezone
  const locale = getIntlLocale(currentUser.language)

  const projects =
    typeFilter === 'all'
      ? allProjects
      : allProjects.filter((p) => p.type === typeFilter)

  const employeeById = new Map(employees.map((e) => [e.id, e]))

  return (
    <ListLayout
      title="Projects"
      subtitle={
        <>
          {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          {q ? <> matching “{q}”</> : null}
        </>
      }
      toolbar={
        <>
          <div className="flex-1 sm:max-w-md">
            <SearchBar
              initialValue={q}
              placeholder="Search by name or description…"
              ariaLabel="Search projects"
            />
          </div>
          <StatusFilter value={status} />
          <ProjectTypeFilter value={typeFilter} />
          <div className="sm:ml-auto">
            <Link href="/projects/new">
              <Button>+ Add Project</Button>
            </Link>
          </div>
        </>
      }
    >
      <Card>
        {projects.length === 0 ? (
          <EmptyTableState>
            {q
              ? <>No projects match this search.</>
              : <>
                  No projects match these filters.{' '}
                  <Link
                    href="/projects/new"
                    className="font-medium text-accent hover:underline"
                  >
                    Add one
                  </Link>{' '}
                  to get started.
                </>}
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
                      className="font-medium text-text hover:underline"
                    >
                      {p.name}
                    </Link>
                  </TD>
                  <TD>{PROJECT_PHASE_LABELS[p.phase]}</TD>
                  <TD>{formatDate(p.startDate, tz, locale)}</TD>
                  <TD>{formatDate(p.dueDate, tz, locale)}</TD>
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
    </ListLayout>
  )
}
