import { BackChevron } from '@/components/BackChevron'
import { Card } from '@/components/Card'
import { getCurrentUser } from '@/lib/auth.server'

import { LabourForm, type LabourFormInitial } from '../_components/LabourForm'
import { loadEmployees, loadProjects } from '../_lib/selectOptions'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default async function NewLabourPage({
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
  // "Add labour" quick-action on the project detail page.
  const preselectedProjectId = projects.find((p) => p.id === rawProjectId)?.id
  const isFromProject = Boolean(preselectedProjectId)

  const initial: LabourFormInitial = {
    date: todayIso(),
    employeeId: lockedToEmployeeId ?? employees[0]?.id ?? '',
    projectId: preselectedProjectId ?? projects[0]?.id ?? '',
    hours: '',
    labourTime: 'regular',
    labourType: 'programming',
    objectiveEvidence: 'none',
    notes: '',
  }

  // When the form was opened from a project's detail page, return there on
  // save/cancel; otherwise stick with the labour list as the default.
  const returnHref = isFromProject
    ? `/projects/${preselectedProjectId}`
    : '/labour'

  return (
    <div className="space-y-12">
      <header className="flex items-center gap-3">
        <BackChevron
          href={returnHref}
          label={isFromProject ? 'Back to project' : 'Back to labour'}
        />
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            New labour entry
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Log time against a project.
          </p>
        </div>
      </header>

      <Card>
        <LabourForm
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
