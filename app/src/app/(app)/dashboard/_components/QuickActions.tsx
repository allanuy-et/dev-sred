import { ExpenseFormDialog } from '@/components/dialogs/ExpenseFormDialog'
import { LabourFormDialog } from '@/components/dialogs/LabourFormDialog'
import { ProjectFormDialog } from '@/components/dialogs/ProjectFormDialog'
import type {
  EmployeeOption,
  SelectOption,
} from '@/app/(app)/labour/_lib/selectOptions'

export interface QuickActionsProps {
  employees: EmployeeOption[]
  projects: SelectOption[]
  parentProjects: SelectOption[]
  /**
   * When set, the labour/expense pickers are locked to this employee id and
   * the "+ Project" button is hidden (project CRUD stays admin/standard but
   * the trigger is omitted here to keep standard users focused on their own
   * data entry).
   */
  lockedToEmployeeId?: string
  /** Whether to render the "+ Project" trigger. Admin-only by convention. */
  canCreateProject?: boolean
}

/**
 * Quick-action button cluster used in the dashboard hero. Each button opens
 * the matching form dialog in place, so the user never leaves the dashboard
 * to log a labour entry / expense / project.
 */
export function QuickActions({
  employees,
  projects,
  parentProjects,
  lockedToEmployeeId,
  canCreateProject = true,
}: QuickActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <LabourFormDialog
        triggerLabel="+ Labour"
        triggerSize="sm"
        employees={employees}
        projects={projects}
        lockedToEmployeeId={lockedToEmployeeId}
      />
      <ExpenseFormDialog
        triggerLabel="+ Expense"
        triggerSize="sm"
        triggerVariant="secondary"
        employees={employees}
        projects={projects}
        lockedToEmployeeId={lockedToEmployeeId}
      />
      {canCreateProject ? (
        <ProjectFormDialog
          triggerLabel="+ Project"
          triggerSize="sm"
          triggerVariant="secondary"
          employees={employees}
          parentProjects={parentProjects}
        />
      ) : null}
    </div>
  )
}
