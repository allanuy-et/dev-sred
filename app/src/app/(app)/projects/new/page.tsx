import Link from 'next/link'

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
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            New project
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Create a project to track labour and expenses against.
          </p>
        </div>
        <Link
          href="/projects"
          className="text-sm font-medium text-text-muted hover:text-text"
        >
          ← Back to projects
        </Link>
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
