export type ProjectType = 'sred' | 'internal'
export type ProjectPhase = 'concept' | 'development' | 'complete'
export type ProjectStatus = 'active' | 'inactive'

export interface Project {
  id: string
  companyId: string
  name: string
  description: string | null
  type: ProjectType
  isGlobal: boolean
  parentProjectId: string | null
  status: ProjectStatus
  phase: ProjectPhase
  startDate: string | null
  dueDate: string | null
  projectManagerId: string | null
  createdAt: string
  updatedAt: string
}
