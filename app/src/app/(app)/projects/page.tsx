import Link from 'next/link'

import type {
  EmployeeListResponse,
  ProjectListResponse,
  User,
} from '@sred/shared'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ListLayout } from '@/components/ListLayout'
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

type TypeFilter = 'all' | 'sred' | 'internal'
function parseTypeFilter(raw: string | undefined): TypeFilter {
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
  // Project-type filter is applied client-side because the backend list
  // endpoint doesn't take a `?type=` filter yet (and we don't need to add
  // one — the data set is small enough that filtering after fetch is fine).

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
      filters={
        <div className="space-y-5">
          <FilterGroup label="Status">
            <StatusFilter value={status} />
          </FilterGroup>
          <FilterGroup label="Type">
            <TypeFilterLinks current={typeFilter} status={status} q={q} />
          </FilterGroup>
        </div>
      }
      toolbar={
        <>
          <div className="w-full sm:max-w-md">
            <SearchBar
              initialValue={q}
              placeholder="Search by name or description…"
              ariaLabel="Search projects"
            />
          </div>
          <Link href="/projects/new">
            <Button>+ Add Project</Button>
          </Link>
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

function FilterGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </p>
      {children}
    </div>
  )
}

function TypeFilterLinks({
  current,
  status,
  q,
}: {
  current: TypeFilter
  status: 'active' | 'inactive' | 'all'
  q: string
}) {
  const options: Array<{ value: TypeFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'sred', label: 'SR&ED' },
    { value: 'internal', label: 'Internal' },
  ]
  function hrefFor(value: TypeFilter): string {
    const params = new URLSearchParams()
    if (status !== 'active') params.set('status', status)
    if (q.trim().length >= 2) params.set('q', q.trim())
    if (value !== 'all') params.set('type', value)
    const qs = params.toString()
    return qs ? `/projects?${qs}` : '/projects'
  }
  return (
    <div className="flex flex-col gap-1">
      {options.map((opt) => {
        const active = opt.value === current
        return (
          <Link
            key={opt.value}
            href={hrefFor(opt.value)}
            className={`block rounded-md px-2 py-1.5 text-sm ${
              active
                ? 'bg-accent-soft text-accent font-medium'
                : 'text-text-muted hover:bg-surface-hover hover:text-text'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            {opt.label}
          </Link>
        )
      })}
    </div>
  )
}
