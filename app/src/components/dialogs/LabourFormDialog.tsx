'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import {
  LabourForm,
  type LabourFormInitial,
} from '@/app/(app)/labour/_components/LabourForm'
import type { SelectOption } from '@/app/(app)/labour/_lib/selectOptions'

export interface LabourFormDialogProps {
  /** Label inside the trigger button. */
  triggerLabel: string
  /**
   * Trigger button variant — defaults to `primary` (the toolbar Add button
   * look). Use `secondary` for the quieter inline buttons on detail-page
   * asides.
   */
  triggerVariant?: 'primary' | 'secondary'
  /** Trigger button size — defaults to `default`. */
  triggerSize?: 'default' | 'sm'
  /** Optional className passthrough to wrap the trigger button. */
  triggerClassName?: string
  employees: SelectOption[]
  projects: SelectOption[]
  /** Pre-select a project (e.g. when invoked from a project's detail page). */
  presetProjectId?: string
  /** Pre-select an employee (e.g. when invoked from an employee's detail page). */
  presetEmployeeId?: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Trigger button + modal wrapper around `<LabourForm>`. The form itself stays
 * unchanged — when its `onSuccess` callback fires we close the dialog and
 * `router.refresh()` so the surrounding page re-fetches its data.
 *
 * The standalone `/labour/new` route still exists for direct links / SEO; it
 * uses the same form without callbacks (default router.push behaviour).
 */
export function LabourFormDialog({
  triggerLabel,
  triggerVariant = 'primary',
  triggerSize = 'default',
  triggerClassName,
  employees,
  projects,
  presetProjectId,
  presetEmployeeId,
}: LabourFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const initial: LabourFormInitial = {
    date: todayIso(),
    employeeId: presetEmployeeId ?? employees[0]?.id ?? '',
    projectId: presetProjectId ?? projects[0]?.id ?? '',
    hours: '',
    labourTime: 'regular',
    labourType: 'programming',
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
      <Dialog
        title="New labour entry"
        open={open}
        onClose={() => setOpen(false)}
      >
        <LabourForm
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
