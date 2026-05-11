import Link from 'next/link'

import type { EmployeeListResponse } from '@sred/shared'

import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
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
import { StatusFilter } from '@/components/StatusFilter'
import { serverApi } from '@/lib/api.server'
import { ACCESS_LEVEL_LABELS } from '@/lib/employee-labels'
import { parseStatusFilter } from '@/lib/status-filter'

export default async function EmployeesListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: rawStatus } = await searchParams
  const status = parseStatusFilter(rawStatus)

  const { employees } = await serverApi<EmployeeListResponse>(
    `/employees?status=${status}`,
  )

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Employees</h1>
          <p className="mt-1 text-sm text-text-muted">
            {employees.length}{' '}
            {employees.length === 1 ? 'employee' : 'employees'} shown.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusFilter value={status} />
          <Link href="/employees/new">
            <Button>+ Add Employee</Button>
          </Link>
        </div>
      </header>

      <Card>
        {employees.length === 0 ? (
          <EmptyTableState>
            No employees match this filter.{' '}
            <Link
              href="/employees/new"
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
    </div>
  )
}
