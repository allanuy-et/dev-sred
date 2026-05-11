import type { ProjectPhase, ProjectType } from '@sred/shared'

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  sred: 'SR&ED',
  internal: 'Internal',
}

export const PROJECT_TYPES: ReadonlyArray<ProjectType> = ['sred', 'internal']

export const PROJECT_PHASE_LABELS: Record<ProjectPhase, string> = {
  concept: 'Concept',
  development: 'Development',
  complete: 'Complete',
}

export const PROJECT_PHASES: ReadonlyArray<ProjectPhase> = [
  'concept',
  'development',
  'complete',
]
