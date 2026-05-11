import type { Project, User } from '@sred/shared'

import { serverApi } from '@/lib/api.server'

export interface SelectOption {
  id: string
  label: string
}

export async function loadEmployees(): Promise<SelectOption[]> {
  const { employees } = await serverApi<{ employees: User[] }>('/employees')
  return employees.map((e) => ({
    id: e.id,
    label: `${e.firstName} ${e.lastName}`,
  }))
}

export async function loadProjects(): Promise<SelectOption[]> {
  const { projects } = await serverApi<{ projects: Project[] }>('/projects')
  return projects.map((p) => ({ id: p.id, label: p.name }))
}
