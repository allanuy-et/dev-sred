'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/Button'
import { Dialog } from '@/components/Dialog'
import {
  EmployeeForm,
  type EmployeeFormInitial,
} from '@/app/(app)/employees/_components/EmployeeForm'

export interface EmployeeFormDialogProps {
  triggerLabel: string
  triggerVariant?: 'primary' | 'secondary'
  triggerSize?: 'default' | 'sm'
  triggerClassName?: string
}

const INITIAL: EmployeeFormInitial = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: '',
  accessLevel: 'standard',
  regularRate: '',
  overtimeRate: '',
  holidayRate: '',
  paid: 'hourly',
  hoursPerYear: 2080,
  specifiedEmployee: false,
  startDate: '',
  qualifications: '',
}

/**
 * Trigger button + modal wrapper around `<EmployeeForm>`. See
 * `LabourFormDialog` for the rationale.
 */
export function EmployeeFormDialog({
  triggerLabel,
  triggerVariant = 'primary',
  triggerSize = 'default',
  triggerClassName,
}: EmployeeFormDialogProps) {
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
      <Dialog title="New employee" open={open} onClose={() => setOpen(false)}>
        <EmployeeForm
          mode="create"
          initial={INITIAL}
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
