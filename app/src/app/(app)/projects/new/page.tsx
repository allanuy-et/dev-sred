import { BackChevron } from '@/components/BackChevron'
import { Card } from '@/components/Card'

import { loadEmployees, loadProjects } from '../../labour/_lib/selectOptions'
import {
  ProjectForm,
  type ProjectFormInitial,
} from '../_components/ProjectForm'

const INITIAL: ProjectFormInitial = {
  name: '',
  description: '',
  type: 'sred',
  isGlobal: false,
  parentProjectId: '',
  phase: 'concept',
  startDate: '',
  dueDate: '',
  projectManagerId: '',
}

export default async function NewProjectPage() {
  const [employees, parentProjects] = await Promise.all([
    loadEmployees(),
    loadProjects(),
  ])

  return (
    <div className="space-y-12">
      <header className="flex items-center gap-3">
        <BackChevron href="/projects" label="Back to projects" />
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            New project
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Create a project to track labour and expenses against.
          </p>
        </div>
      </header>

      <Card>
        <ProjectForm
          mode="create"
          initial={INITIAL}
          employees={employees}
          parentProjects={parentProjects}
          onCancelHref="/projects"
        />
      </Card>
    </div>
  )
}
