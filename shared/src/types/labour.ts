export type LabourTime = 'regular' | 'overtime' | 'double'
export type LabourType =
  | 'alpha_test'
  | 'beta_test'
  | 'programming'
  | 'test_and_measurement'
  | 'design_modifications'
  | 'analysis'
  | 'other'
export type ObjectiveEvidence =
  | 'none'
  | 'design_of_experiments'
  | 'test_records'
  | 'progress_reports'

export interface LabourEntry {
  id: string
  date: string
  employeeId: string
  projectId: string
  hours: number
  labourTime: LabourTime
  labourType: LabourType
  objectiveEvidence: ObjectiveEvidence
  notes: string | null
  filePath: string | null
  createdAt: string
  updatedAt: string
}

export interface LabourEntryWithRelations extends LabourEntry {
  employeeName: string
  projectName: string
}
