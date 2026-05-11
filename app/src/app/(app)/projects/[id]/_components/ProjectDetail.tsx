'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { Project } from '@sred/shared'

import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { ApiError } from '@/lib/api'
import { clientApi } from '@/lib/api.client'
import { formatDate } from '@/lib/format'
import {
  PROJECT_PHASE_LABELS,
  PROJECT_TYPE_LABELS,
} from '@/lib/project-labels'

import type { SelectOption } from '../../../labour/_lib/selectOptions'
import {
  ProjectForm,
  projectToFormInitial,
} from '../../_components/ProjectForm'
import { NarrativeButton } from './NarrativeButton'

export interface ProjectDetailProps {
  project: Project
  employees: SelectOption[]
  parentProjects: SelectOption[]
}

export function ProjectDetail({
  project,
  employees,
  parentProjects,
}: ProjectDetailProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isActive = project.status === 'active'
  const managerLabel =
    employees.find((e) => e.id === project.projectManagerId)?.label ?? '—'
  const parentLabel =
    parentProjects.find((p) => p.id === project.parentProjectId)?.label ?? '—'

  async function handleToggleStatus() {
    const action = isActive ? 'deactivate' : 'reactivate'
    if (action === 'deactivate') {
      if (
        !window.confirm(
          `Deactivate "${project.name}"? It will be hidden from active lists until reactivated.`,
        )
      ) {
        return
      }
    }
    setError(null)
    setPending(true)
    try {
      await clientApi<{ ok: boolean }>(`/projects/${project.id}/${action}`, {
        method: 'POST',
      })
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Please sign in again.')
      } else {
        setError(
          isActive
            ? 'Could not deactivate the project. Please try again.'
            : 'Could not reactivate the project. Please try again.',
        )
      }
    } finally {
      setPending(false)
    }
  }

  if (editing) {
    return (
      <ProjectForm
        mode="edit"
        projectId={project.id}
        initial={projectToFormInitial(project)}
        employees={employees}
        parentProjects={parentProjects}
        onSuccessHref={`/projects/${project.id}`}
        onCancelHref={`/projects/${project.id}`}
      />
    )
  }

  return (
    <div className="space-y-6">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <DescriptionItem
          label="Status"
          value={
            isActive ? (
              <Badge variant="active">Active</Badge>
            ) : (
              <Badge variant="neutral">Inactive</Badge>
            )
          }
        />
        <DescriptionItem
          label="Type"
          value={PROJECT_TYPE_LABELS[project.type]}
        />
        <DescriptionItem
          label="Phase"
          value={
            project.phase === 'concept' ? (
              <Badge variant="concept">
                {PROJECT_PHASE_LABELS[project.phase]}
              </Badge>
            ) : (
              PROJECT_PHASE_LABELS[project.phase]
            )
          }
        />
        <DescriptionItem
          label="Global"
          value={project.isGlobal ? 'Yes' : 'No'}
        />
        <DescriptionItem
          label="Start date"
          value={formatDate(project.startDate)}
        />
        <DescriptionItem
          label="Due date"
          value={formatDate(project.dueDate)}
        />
        <DescriptionItem label="Project manager" value={managerLabel} />
        <DescriptionItem label="Parent project" value={parentLabel} />
        <DescriptionItem
          label="Description"
          value={project.description ?? '—'}
          className="sm:col-span-2"
        />
      </dl>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant={isActive ? 'destructive' : 'secondary'}
          onClick={handleToggleStatus}
          disabled={pending}
        >
          {pending
            ? isActive
              ? 'Deactivating…'
              : 'Reactivating…'
            : isActive
              ? 'Deactivate'
              : 'Reactivate'}
        </Button>
        <Button onClick={() => setEditing(true)}>Edit</Button>
      </div>

      <NarrativeButton projectId={project.id} projectName={project.name} />
    </div>
  )
}

function DescriptionItem({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-text">{value}</dd>
    </div>
  )
}
