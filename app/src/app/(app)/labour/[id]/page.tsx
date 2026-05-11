import { notFound } from 'next/navigation'

import type {
  LabourEntryWithRelations,
  LabourEntryWithRelationsResponse,
} from '@sred/shared'

import { BackChevron } from '@/components/BackChevron'
import { Card } from '@/components/Card'
import { ApiError } from '@/lib/api'
import { serverApi } from '@/lib/api.server'

import { loadEmployees, loadProjects } from '../_lib/selectOptions'
import { LabourDetail } from './_components/LabourDetail'

async function loadEntry(id: string): Promise<LabourEntryWithRelations | null> {
  try {
    const { entry } = await serverApi<LabourEntryWithRelationsResponse>(
      `/labour/${id}`,
    )
    return entry
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export default async function LabourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [entry, employees, projects] = await Promise.all([
    loadEntry(id),
    // Pass 'all' so a deactivated employee/project that's still referenced
    // by this entry stays in the edit dropdown — otherwise saving silently
    // drops the assignment.
    loadEmployees('all'),
    loadProjects('all'),
  ])

  if (!entry) notFound()

  return (
    <div className="space-y-12">
      <header className="flex items-center gap-3">
        <BackChevron href="/labour" label="Back to labour" />
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            Labour entry
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {entry.employeeName} · {entry.projectName}
          </p>
        </div>
      </header>

      <Card>
        <LabourDetail
          entry={entry}
          employees={employees}
          projects={projects}
        />
      </Card>
    </div>
  )
}
