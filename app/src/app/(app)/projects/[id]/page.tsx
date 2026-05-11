import Link from 'next/link'
import { notFound } from 'next/navigation'

import type { Project, ProjectResponse } from '@sred/shared'

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
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
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

      <ProjectDetail
        project={project}
        employees={employees}
        parentProjects={parentOptions}
      />
    </div>
  )
}
