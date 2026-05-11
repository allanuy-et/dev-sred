import Link from 'next/link'

import type {
  EmployeeListResponse,
  Project,
  ProjectListResponse,
  User,
} from '@sred/shared'

import { Card } from '@/components/Card'
import { ProjectFormDialog } from '@/components/dialogs/ProjectFormDialog'
import { ListLayout } from '@/components/ListLayout'
import {
  ProjectTypeFilter,
  type ProjectTypeFilterValue,
} from '@/components/ProjectTypeFilter'
import { SearchBar } from '@/components/SearchBar'
import { SortableTH, type SortDirection } from '@/components/SortableTH'
import { StatusFilter } from '@/components/StatusFilter'
import {
  EmptyTableState,
  TBody,
  TD,
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

import { loadEmployees, loadProjects } from '../labour/_lib/selectOptions'

function managerName(user: User | undefined): string {
  if (!user) return '—'
  return `${user.firstName} ${user.lastName}`
}

function parseTypeFilter(raw: string | undefined): ProjectTypeFilterValue {
  if (raw === 'sred' || raw === 'internal') return raw
  return 'all'
}

type SortKey = 'name' | 'phase' | 'startDate' | 'dueDate' | 'manager'

function cmpString(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? '').localeCompare(b ?? '')
}

function parseSortKey(raw: string | undefined): SortKey | null {
  if (
    raw === 'name' ||
    raw === 'phase' ||
    raw === 'startDate' ||
    raw === 'dueDate' ||
    raw === 'manager'
  ) {
    return raw
  }
  return null
}

function parseSortDir(raw: string | undefined): SortDirection {
  return raw === 'desc' ? 'desc' : 'asc'
}

export default async function ProjectsListPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    type?: string
    q?: string
    sortBy?: string
    sortDir?: string
  }>
}) {
  const {
    status: rawStatus,
    type: rawType,
    q: rawQ,
    sortBy: rawSortBy,
    sortDir: rawSortDir,
  } = await searchParams
  const status = parseStatusFilter(rawStatus)
  const typeFilter = parseTypeFilter(rawType)
  const q = typeof rawQ === 'string' ? rawQ : ''
  const sortBy = parseSortKey(rawSortBy)
  const sortDir = parseSortDir(rawSortDir)

  const params = new URLSearchParams({ status })
  if (q.trim().length >= 2) params.set('q', q.trim())

  const [
    { projects: allProjects },
    { employees },
    employeeOptions,
    parentProjectOptions,
    currentUser,
  ] = await Promise.all([
    serverApi<ProjectListResponse>(`/projects?${params.toString()}`),
    serverApi<EmployeeListResponse>('/employees?status=all'),
    loadEmployees('all'),
    loadProjects('all'),
    getCurrentUser(),
  ])

  if (!currentUser) return null
  const tz = currentUser.timezone
  const locale = getIntlLocale(currentUser.language)

  const employeeById = new Map(employees.map((e) => [e.id, e]))

  // Type filter is applied client-side (the backend list endpoint doesn't
  // accept `?type=` and the data set is small enough for in-memory filtering).
  const filtered =
    typeFilter === 'all'
      ? allProjects
      : allProjects.filter((p) => p.type === typeFilter)

  const comparators: Record<SortKey, (a: Project, b: Project) => number> = {
    name: (a, b) => cmpString(a.name, b.name),
    phase: (a, b) => cmpString(a.phase, b.phase),
    startDate: (a, b) => cmpString(a.startDate, b.startDate),
    dueDate: (a, b) => cmpString(a.dueDate, b.dueDate),
    manager: (a, b) =>
      cmpString(
        managerName(employeeById.get(a.projectManagerId ?? '')),
        managerName(employeeById.get(b.projectManagerId ?? '')),
      ),
  }

  const projects = sortBy
    ? [...filtered].sort(
        (a, b) => comparators[sortBy](a, b) * (sortDir === 'desc' ? -1 : 1),
      )
    : filtered

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
            <ProjectFormDialog
              triggerLabel="+ Add Project"
              employees={employeeOptions}
              parentProjects={parentProjectOptions}
            />
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
                <SortableTH sortKey="name" currentSortKey={sortBy} currentSortDir={sortDir}>
                  Name
                </SortableTH>
                <SortableTH sortKey="phase" currentSortKey={sortBy} currentSortDir={sortDir}>
                  Phase
                </SortableTH>
                <SortableTH sortKey="startDate" currentSortKey={sortBy} currentSortDir={sortDir}>
                  Start Date
                </SortableTH>
                <SortableTH sortKey="dueDate" currentSortKey={sortBy} currentSortDir={sortDir}>
                  Due Date
                </SortableTH>
                <SortableTH sortKey="manager" currentSortKey={sortBy} currentSortDir={sortDir}>
                  Manager
                </SortableTH>
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
