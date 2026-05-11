import type { Project, User } from '@sred/shared'

import { serverApi } from '@/lib/api.server'
import type { StatusFilterValue } from '@/lib/status-filter'

export interface SelectOption {
  id: string
  label: string
}

/**
 * Load options for an employee select.
 *
 * Default `status=active` covers the "create new" case (you wouldn't assign
 * a fresh entry to a deactivated employee). For edit forms on existing rows,
 * pass `'all'` so the currently-assigned employee still appears in the
 * dropdown even if they've since been deactivated — otherwise the form
 * silently clears the assignment on save.
 */
export async function loadEmployees(
  status: StatusFilterValue = 'active',
): Promise<SelectOption[]> {
  const { employees } = await serverApi<{ employees: User[] }>(
    `/employees?status=${status}`,
  )
  return employees.map((e) => ({
    id: e.id,
    label: `${e.firstName} ${e.lastName}`,
  }))
}

/** Same rationale as `loadEmployees` — see its docstring. */
export async function loadProjects(
  status: StatusFilterValue = 'active',
): Promise<SelectOption[]> {
  const { projects } = await serverApi<{ projects: Project[] }>(
    `/projects?status=${status}`,
  )
  return projects.map((p) => ({ id: p.id, label: p.name }))
}
