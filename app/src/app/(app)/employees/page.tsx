import Link from 'next/link'

import type { EmployeeListResponse, User } from '@sred/shared'

import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ListLayout } from '@/components/ListLayout'
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
import { ACCESS_LEVEL_LABELS } from '@/lib/employee-labels'
import { parseStatusFilter } from '@/lib/status-filter'

type SortKey = 'name' | 'role' | 'access' | 'status'

const SORT_COMPARATORS: Record<SortKey, (a: User, b: User) => number> = {
  name: (a, b) =>
    `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
  role: (a, b) => (a.role ?? '').localeCompare(b.role ?? ''),
  access: (a, b) => a.accessLevel.localeCompare(b.accessLevel),
  status: (a, b) => a.status.localeCompare(b.status),
}

function parseSortKey(raw: string | undefined): SortKey | null {
  if (raw === 'name' || raw === 'role' || raw === 'access' || raw === 'status') {
    return raw
  }
  return null
}

function parseSortDir(raw: string | undefined): SortDirection {
  return raw === 'desc' ? 'desc' : 'asc'
}

export default async function EmployeesListPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    q?: string
    sortBy?: string
    sortDir?: string
  }>
}) {
  const {
    status: rawStatus,
    q: rawQ,
    sortBy: rawSortBy,
    sortDir: rawSortDir,
  } = await searchParams
  const status = parseStatusFilter(rawStatus)
  const q = typeof rawQ === 'string' ? rawQ : ''
  const sortBy = parseSortKey(rawSortBy)
  const sortDir = parseSortDir(rawSortDir)

  const params = new URLSearchParams({ status })
  if (q.trim().length >= 2) params.set('q', q.trim())
  const { employees } = await serverApi<EmployeeListResponse>(
    `/employees?${params.toString()}`,
  )

  const sortedEmployees = sortBy
    ? [...employees].sort((a, b) =>
        SORT_COMPARATORS[sortBy](a, b) * (sortDir === 'desc' ? -1 : 1),
      )
    : employees

  return (
    <ListLayout
      title="Employees"
      subtitle={
        <>
          {sortedEmployees.length}{' '}
          {sortedEmployees.length === 1 ? 'employee' : 'employees'}
          {q ? <> matching “{q}”</> : null}
        </>
      }
      toolbar={
        <>
          <div className="flex-1 sm:max-w-md">
            <SearchBar
              initialValue={q}
              placeholder="Search by name, email, or role…"
              ariaLabel="Search employees"
            />
          </div>
          <StatusFilter value={status} />
          <div className="sm:ml-auto">
            <Link href="/employees/new">
              <Button>+ Add Employee</Button>
            </Link>
          </div>
        </>
      }
    >
      <Card>
        {sortedEmployees.length === 0 ? (
          <EmptyTableState>
            {q
              ? <>No employees match this search.</>
              : <>
                  No employees match this filter.{' '}
                  <Link
                    href="/employees/new"
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
                <SortableTH sortKey="role" currentSortKey={sortBy} currentSortDir={sortDir}>
                  Role / Title
                </SortableTH>
                <SortableTH sortKey="access" currentSortKey={sortBy} currentSortDir={sortDir}>
                  Access
                </SortableTH>
                <SortableTH sortKey="status" currentSortKey={sortBy} currentSortDir={sortDir}>
                  Status
                </SortableTH>
              </TR>
            </THead>
            <TBody>
              {sortedEmployees.map((emp) => (
                <TRLink
                  key={emp.id}
                  href={`/employees/${emp.id}`}
                  accessibleLabel={`View employee ${emp.firstName} ${emp.lastName}`}
                >
                  <TD>
                    <Link
                      href={`/employees/${emp.id}`}
                      className="font-medium text-text hover:underline"
                    >
                      {emp.firstName} {emp.lastName}
                    </Link>
                    <div className="text-xs text-text-muted">{emp.email}</div>
                  </TD>
                  <TD>{emp.role ?? '—'}</TD>
                  <TD>{ACCESS_LEVEL_LABELS[emp.accessLevel]}</TD>
                  <TD>
                    {emp.status === 'active' ? (
                      <Badge variant="active">Active</Badge>
                    ) : (
                      <Badge variant="neutral">Inactive</Badge>
                    )}
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
