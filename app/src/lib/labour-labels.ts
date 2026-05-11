import type { LabourTime, LabourType, ObjectiveEvidence } from '@sred/shared'

export const LABOUR_TIME_LABELS: Record<LabourTime, string> = {
  regular: 'Regular',
  overtime: 'Overtime',
  double: 'Double',
}

export const LABOUR_TYPE_LABELS: Record<LabourType, string> = {
  alpha_test: 'Alpha Test',
  beta_test: 'Beta Test',
  programming: 'Programming',
  test_and_measurement: 'Test and Measurement',
  design_modifications: 'Design Modifications',
  analysis: 'Analysis',
  other: 'Other',
}

export const OBJECTIVE_EVIDENCE_LABELS: Record<ObjectiveEvidence, string> = {
  none: 'None',
  design_of_experiments: 'Design of Experiments',
  test_records: 'Test Records',
  progress_reports: 'Progress Reports',
}

export const LABOUR_TIMES: ReadonlyArray<LabourTime> = [
  'regular',
  'overtime',
  'double',
]

export const LABOUR_TYPES: ReadonlyArray<LabourType> = [
  'alpha_test',
  'beta_test',
  'programming',
  'test_and_measurement',
  'design_modifications',
  'analysis',
  'other',
]

export const OBJECTIVE_EVIDENCES: ReadonlyArray<ObjectiveEvidence> = [
  'none',
  'design_of_experiments',
  'test_records',
  'progress_reports',
]
