import Link from 'next/link'

import { Card } from '@/components/Card'

import {
  EmployeeForm,
  type EmployeeFormInitial,
} from '../_components/EmployeeForm'

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

export default function NewEmployeePage() {
  return (
    <div className="space-y-12">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            New employee
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Create a user with sign-in credentials and rate information.
          </p>
        </div>
        <Link
          href="/employees"
          className="text-sm font-medium text-text-muted hover:text-text"
        >
          ← Back to employees
        </Link>
      </header>

      <Card>
        <EmployeeForm
          mode="create"
          initial={INITIAL}
          onCancelHref="/employees"
        />
      </Card>
    </div>
  )
}
