'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type {
  CreateProjectInput,
  Project,
  ProjectPhase,
  ProjectResponse,
  ProjectType,
  UpdateProjectInput,
} from '@sred/shared'

import { Button } from '@/components/Button'
import { Field, SelectField, TextAreaField } from '@/components/Field'
import { ApiError } from '@/lib/api'
import { clientApi } from '@/lib/api.client'
import {
  PROJECT_PHASES,
  PROJECT_PHASE_LABELS,
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
} from '@/lib/project-labels'

import type { SelectOption } from '../../labour/_lib/selectOptions'

export interface ProjectFormInitial {
  name: string
  description: string
  type: ProjectType
  isGlobal: boolean
  parentProjectId: string
  phase: ProjectPhase
  startDate: string
  dueDate: string
  projectManagerId: string
}

export interface ProjectFormProps {
  mode: 'create' | 'edit'
  initial: ProjectFormInitial
  /** Employees available for the project-manager select. */
  employees: SelectOption[]
  /** Other projects available for the parent-project select. */
  parentProjects: SelectOption[]
  /** Required for `edit` mode. */
  projectId?: string
  /**
   * Where to navigate on a successful save. Ignored when `onSuccess` is
   * provided. Defaults to `/projects`.
   */
  onSuccessHref?: string
  /** Optional secondary action (e.g. cancel back to detail). */
  onCancelHref?: string
  /**
   * Callback fired after a successful save. When provided, the form does
   * NOT navigate; the caller is responsible for closing a modal /
   * refreshing the page / etc.
   */
  onSuccess?: () => void
  /**
   * Callback fired when the user clicks Cancel. When provided, the form
   * does NOT navigate; the caller decides what "cancel" means.
   */
  onCancel?: () => void
}

function toNullableTrimmed(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function toNullableDate(value: string): string | null {
  return value === '' ? null : value
}

export function ProjectForm({
  mode,
  initial,
  employees,
  parentProjects,
  projectId,
  onSuccessHref = '/projects',
  onCancelHref,
  onSuccess,
  onCancel,
}: ProjectFormProps) {
  const router = useRouter()
  const [state, setState] = useState<ProjectFormInitial>(initial)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof ProjectFormInitial>(
    key: K,
    value: ProjectFormInitial[K],
  ) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!state.name.trim()) {
      setError('Please enter a project name.')
      return
    }

    const body: CreateProjectInput = {
      name: state.name.trim(),
      description: toNullableTrimmed(state.description),
      type: state.type,
      isGlobal: state.isGlobal,
      parentProjectId: state.parentProjectId === '' ? null : state.parentProjectId,
      phase: state.phase,
      startDate: toNullableDate(state.startDate),
      dueDate: toNullableDate(state.dueDate),
      projectManagerId:
        state.projectManagerId === '' ? null : state.projectManagerId,
    }

    setSubmitting(true)
    try {
      if (mode === 'create') {
        await clientApi<ProjectResponse>('/projects', {
          method: 'POST',
          body,
        })
      } else {
        if (!projectId) throw new Error('Missing project id for edit')
        const update: UpdateProjectInput = body
        await clientApi<ProjectResponse>(`/projects/${projectId}`, {
          method: 'PATCH',
          body: update,
        })
      }
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(onSuccessHref)
        router.refresh()
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Your session expired. Please sign in again.')
      } else if (err instanceof ApiError && err.status === 400) {
        setError('Please double-check the entry — something looked off.')
      } else {
        setError('Could not save the project. Please try again.')
      }
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Name"
          required
          className="sm:col-span-2"
          value={state.name}
          onChange={(e) => update('name', e.currentTarget.value)}
        />

        <SelectField
          label="Type"
          value={state.type}
          onChange={(e) =>
            update('type', e.currentTarget.value as ProjectType)
          }
        >
          {PROJECT_TYPES.map((v) => (
            <option key={v} value={v}>
              {PROJECT_TYPE_LABELS[v]}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Phase"
          value={state.phase}
          onChange={(e) =>
            update('phase', e.currentTarget.value as ProjectPhase)
          }
        >
          {PROJECT_PHASES.map((v) => (
            <option key={v} value={v}>
              {PROJECT_PHASE_LABELS[v]}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Global project"
          value={state.isGlobal ? 'yes' : 'no'}
          onChange={(e) => update('isGlobal', e.currentTarget.value === 'yes')}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </SelectField>

        <SelectField
          label="Parent project"
          value={state.parentProjectId}
          onChange={(e) => update('parentProjectId', e.currentTarget.value)}
        >
          <option value="">— None —</option>
          {parentProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </SelectField>

        <Field
          label="Start date"
          type="date"
          value={state.startDate}
          onChange={(e) => update('startDate', e.currentTarget.value)}
        />
        <Field
          label="Due date"
          type="date"
          value={state.dueDate}
          onChange={(e) => update('dueDate', e.currentTarget.value)}
        />

        <SelectField
          label="Project manager"
          className="sm:col-span-2"
          value={state.projectManagerId}
          onChange={(e) => update('projectManagerId', e.currentTarget.value)}
        >
          <option value="">— Unassigned —</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.label}
            </option>
          ))}
        </SelectField>
      </div>

      <TextAreaField
        label="Description"
        value={state.description}
        onChange={(e) => update('description', e.currentTarget.value)}
        rows={4}
      />

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        {onCancel || onCancelHref ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (onCancel) onCancel()
              else if (onCancelHref) router.push(onCancelHref)
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting
            ? 'Saving…'
            : mode === 'create'
              ? 'Create project'
              : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

/** Map a Project record into the form's initial state. */
export function projectToFormInitial(project: Project): ProjectFormInitial {
  return {
    name: project.name,
    description: project.description ?? '',
    type: project.type,
    isGlobal: project.isGlobal,
    parentProjectId: project.parentProjectId ?? '',
    phase: project.phase,
    startDate: project.startDate ? project.startDate.slice(0, 10) : '',
    dueDate: project.dueDate ? project.dueDate.slice(0, 10) : '',
    projectManagerId: project.projectManagerId ?? '',
  }
}
