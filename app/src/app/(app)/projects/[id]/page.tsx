import Link from 'next/link'
import { notFound } from 'next/navigation'

import type { Project, ProjectResponse } from '@sred/shared'

import { Card } from '@/components/Card'
import { ApiError } from '@/lib/api'
import { serverApi } from '@/lib/api.server'

import { loadEmployees, loadProjects } from '../../labour/_lib/selectOptions'
import { ProjectDetail } from './_components/ProjectDetail'

async function loadProject(id: string): Promise<Project | null> {
  try {
    const { project } = await serverApi<ProjectResponse>(`/projects/${id}`)
    return project
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [project, employees, allProjects] = await Promise.all([
    loadProject(id),
    // Pass 'all' so a deactivated manager/parent that's still referenced by
    // this project stays in the edit dropdown — otherwise saving silently
    // drops the assignment.
    loadEmployees('all'),
    loadProjects('all'),
  ])

  if (!project) notFound()

  // A project cannot be its own parent.
  const parentOptions = allProjects.filter((p) => p.id !== project.id)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-text-muted">
            {project.type === 'sred' ? 'SR&ED' : 'Internal'} project
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
        <ProjectDetail
          project={project}
          employees={employees}
          parentProjects={parentOptions}
        />
      </Card>
    </div>
  )
}
