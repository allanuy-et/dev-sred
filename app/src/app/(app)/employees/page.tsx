import Link from 'next/link'

import type { EmployeeListResponse } from '@sred/shared'

import { Badge } from '@/components/Badge'
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
import { ACCESS_LEVEL_LABELS } from '@/lib/employee-labels'
import { parseStatusFilter } from '@/lib/status-filter'

export default async function EmployeesListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status: rawStatus, q: rawQ } = await searchParams
  const status = parseStatusFilter(rawStatus)
  const q = typeof rawQ === 'string' ? rawQ : ''

  const params = new URLSearchParams({ status })
  if (q.trim().length >= 2) params.set('q', q.trim())
  const { employees } = await serverApi<EmployeeListResponse>(
    `/employees?${params.toString()}`,
  )

  return (
    <ListLayout
      title="Employees"
      subtitle={
        <>
          {employees.length}{' '}
          {employees.length === 1 ? 'employee' : 'employees'}
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
        {employees.length === 0 ? (
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
                <TH>Name</TH>
                <TH>Role / Title</TH>
                <TH>Access</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {employees.map((emp) => (
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
