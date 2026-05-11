import Link from 'next/link'

import { Card } from '@/components/Card'

import { LabourForm, type LabourFormInitial } from '../_components/LabourForm'
import { loadEmployees, loadProjects } from '../_lib/selectOptions'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default async function NewLabourPage() {
  const [employees, projects] = await Promise.all([
    loadEmployees(),
    loadProjects(),
  ])

  const initial: LabourFormInitial = {
    date: todayIso(),
    employeeId: employees[0]?.id ?? '',
    projectId: projects[0]?.id ?? '',
    hours: '',
    labourTime: 'regular',
    labourType: 'programming',
    objectiveEvidence: 'none',
    notes: '',
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">New labour entry</h1>
          <p className="text-sm text-text-muted">
            Log time against a project.
          </p>
        </div>
        <Link
          href="/labour"
          className="text-sm font-medium text-text-muted hover:text-text"
        >
          ← Back to labour
        </Link>
      </header>

      <Card>
        <LabourForm
          mode="create"
          initial={initial}
          employees={employees}
          projects={projects}
          onCancelHref="/labour"
        />
      </Card>
    </div>
  )
}
