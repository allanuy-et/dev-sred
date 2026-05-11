import { BackChevron } from '@/components/BackChevron'
import { Card } from '@/components/Card'
import { getCurrentUser } from '@/lib/auth.server'

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

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>
}) {
  const { projectId: rawProjectId } = await searchParams
  const [employees, projects, currentUser] = await Promise.all([
    loadEmployees(),
    loadProjects(),
    getCurrentUser(),
  ])
  const lockedToEmployeeId =
    currentUser?.accessLevel === 'standard' ? currentUser.id : undefined

  // Pre-select project from `?projectId=` when present and valid. Used by the
  // "Add expense" quick-action on the project detail page.
  const preselectedProjectId = projects.find((p) => p.id === rawProjectId)?.id
  const isFromProject = Boolean(preselectedProjectId)

  const initial: ExpenseFormInitial = {
    date: todayIso(),
    employeeId: lockedToEmployeeId ?? employees[0]?.id ?? '',
    projectId: preselectedProjectId ?? projects[0]?.id ?? '',
    cost: '',
    poNumber: '',
    type: 'materials',
    objectiveEvidence: 'none',
    notes: '',
  }

  const returnHref = isFromProject
    ? `/projects/${preselectedProjectId}`
    : '/expenses'

  return (
    <div className="space-y-12">
      <header className="flex items-center gap-3">
        <BackChevron
          href={returnHref}
          label={isFromProject ? 'Back to project' : 'Back to expenses'}
        />
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">New expense</h1>
          <p className="mt-2 text-sm text-text-muted">
            Record a cost against a project.
          </p>
        </div>
      </header>

      <Card>
        <ExpenseForm
          mode="create"
          initial={initial}
          employees={employees}
          projects={projects}
          lockedToEmployeeId={lockedToEmployeeId}
          onSuccessHref={returnHref}
          onCancelHref={returnHref}
        />
      </Card>
    </div>
  )
}
