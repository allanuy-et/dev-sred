'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import {
  ExpenseForm,
  type ExpenseFormInitial,
} from '@/app/(app)/expenses/_components/ExpenseForm'
import type { SelectOption } from '@/app/(app)/labour/_lib/selectOptions'

export interface ExpenseFormDialogProps {
  triggerLabel: string
  triggerVariant?: 'primary' | 'secondary'
  triggerSize?: 'default' | 'sm'
  triggerClassName?: string
  employees: SelectOption[]
  projects: SelectOption[]
  presetProjectId?: string
  presetEmployeeId?: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Trigger button + modal wrapper around `<ExpenseForm>`. See
 * `LabourFormDialog` for the rationale.
 */
export function ExpenseFormDialog({
  triggerLabel,
  triggerVariant = 'primary',
  triggerSize = 'default',
  triggerClassName,
  employees,
  projects,
  presetProjectId,
  presetEmployeeId,
}: ExpenseFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const initial: ExpenseFormInitial = {
    date: todayIso(),
    employeeId: presetEmployeeId ?? employees[0]?.id ?? '',
    projectId: presetProjectId ?? projects[0]?.id ?? '',
    cost: '',
    poNumber: '',
    type: 'materials',
    objectiveEvidence: 'none',
    notes: '',
  }

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
      <Dialog title="New expense" open={open} onClose={() => setOpen(false)}>
        <ExpenseForm
          mode="create"
          initial={initial}
          employees={employees}
          projects={projects}
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
