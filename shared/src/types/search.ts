export type SearchKind = 'project' | 'employee'

export interface SearchMatch {
  id: string
  label: string
  kind: SearchKind
  detail?: string
}

export interface SearchResponse {
  projects: SearchMatch[]
  employees: SearchMatch[]
}
