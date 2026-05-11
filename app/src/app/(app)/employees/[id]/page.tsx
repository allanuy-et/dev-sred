import Link from 'next/link'
import { notFound } from 'next/navigation'

import type { EmployeeResponse, User } from '@sred/shared'

import { Card } from '@/components/Card'
import { ApiError } from '@/lib/api'
import { serverApi } from '@/lib/api.server'

import { EmployeeDetail } from './_components/EmployeeDetail'

async function loadEmployee(id: string): Promise<User | null> {
  try {
    const { employee } = await serverApi<EmployeeResponse>(`/employees/${id}`)
    return employee
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const employee = await loadEmployee(id)

  if (!employee) notFound()

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-sm text-text-muted">{employee.email}</p>
        </div>
        <Link
          href="/employees"
          className="text-sm font-medium text-text-muted hover:text-text"
        >
          ← Back to employees
        </Link>
      </header>

      <Card>
        <EmployeeDetail employee={employee} />
      </Card>
    </div>
  )
}
