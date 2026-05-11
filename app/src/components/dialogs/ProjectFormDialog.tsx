'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import {
  ProjectForm,
  type ProjectFormInitial,
} from '@/app/(app)/projects/_components/ProjectForm'
import type {
  EmployeeOption,
  SelectOption,
} from '@/app/(app)/labour/_lib/selectOptions'

export interface ProjectFormDialogProps {
  triggerLabel: string
  triggerVariant?: 'primary' | 'secondary'
  triggerSize?: 'default' | 'sm'
  triggerClassName?: string
  /** Employees available for the project-manager select. */
  employees: EmployeeOption[]
  /** Other projects available for the parent-project select. */
  parentProjects: SelectOption[]
}

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

/**
 * Trigger button + modal wrapper around `<ProjectForm>`. See
 * `LabourFormDialog` for the rationale.
 */
export function ProjectFormDialog({
  triggerLabel,
  triggerVariant = 'primary',
  triggerSize = 'default',
  triggerClassName,
  employees,
  parentProjects,
}: ProjectFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>
      <Dialog title="New project" open={open} onClose={() => setOpen(false)}>
        <ProjectForm
          mode="create"
          initial={INITIAL}
          employees={employees}
          parentProjects={parentProjects}
          onSuccess={() => {
            setOpen(false)
            router.refresh()
          }}
          onCancel={() => setOpen(false)}
        />
      </Dialog>
    </>
  )
}
