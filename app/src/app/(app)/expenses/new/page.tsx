import Link from 'next/link'

import { Card } from '@/components/Card'

// Reuse labour's selectOptions helpers — same employee + project select shape.
import {
  loadEmployees,
  loadProjects,
} from '../../labour/_lib/selectOptions'
import {
  ExpenseForm,
  type ExpenseFormInitial,
} from '../_components/ExpenseForm'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default async function NewExpensePage() {
  const [employees, projects] = await Promise.all([
    loadEmployees(),
    loadProjects(),
  ])

  const initial: ExpenseFormInitial = {
    date: todayIso(),
    employeeId: employees[0]?.id ?? '',
    projectId: projects[0]?.id ?? '',
    cost: '',
    poNumber: '',
    type: 'materials',
    objectiveEvidence: 'none',
    notes: '',
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">New expense</h1>
          <p className="text-sm text-text-muted">
            Record a cost against a project.
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
        <ExpenseForm
          mode="create"
          initial={initial}
          employees={employees}
          projects={projects}
          onCancelHref="/expenses"
        />
      </Card>
    </div>
  )
}
