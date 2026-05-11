import Link from 'next/link'
import { notFound } from 'next/navigation'

import type {
  ExpenseWithRelations,
  ExpenseWithRelationsResponse,
} from '@sred/shared'

import { Card } from '@/components/Card'
import { ApiError } from '@/lib/api'
import { serverApi } from '@/lib/api.server'

import {
  loadEmployees,
  loadProjects,
} from '../../labour/_lib/selectOptions'
import { ExpenseDetail } from './_components/ExpenseDetail'

async function loadEntry(id: string): Promise<ExpenseWithRelations | null> {
  try {
    const { entry } = await serverApi<ExpenseWithRelationsResponse>(
      `/expenses/${id}`,
    )
    return entry
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [entry, employees, projects] = await Promise.all([
    loadEntry(id),
    // Pass 'all' so a deactivated employee/project that's still referenced by
    // this entry stays in the edit dropdown — otherwise saving silently drops
    // the assignment.
    loadEmployees('all'),
    loadProjects('all'),
  ])

  if (!entry) notFound()

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expense</h1>
          <p className="text-sm text-text-muted">
            {entry.employeeName} · {entry.projectName}
          </p>
        </div>
        <Link
          href="/expenses"
          className="text-sm font-medium text-text-muted hover:text-text"
        >
          ← Back to expenses
        </Link>
      </header>

      <Card>
        <ExpenseDetail
          entry={entry}
          employees={employees}
          projects={projects}
        />
      </Card>
    </div>
  )
}
