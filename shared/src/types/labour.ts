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

export interface Attachment {
  id: string
  /** Relative path on the API server. Never used directly by the client — use
   *  `/api/<kind>/attachments/:id/download` instead. */
  filePath: string
  originalName: string
  mimeType: string
  sizeBytes: number
  uploadedBy: string | null
  createdAt: string
}

export interface AttachmentListResponse {
  attachments: Attachment[]
}

export interface LabourEntryWithRelations extends LabourEntry {
  employeeName: string
  projectName: string
  attachments: Attachment[]
}

// Inputs accepted by POST /labour and PATCH /labour/:id.
// Server validates these — do not trust the shapes blindly.
export interface CreateLabourInput {
  date: string
  employeeId: string
  projectId: string
  hours: number
  labourTime: LabourTime
  labourType: LabourType
  objectiveEvidence: ObjectiveEvidence
  notes?: string | null
}

export type UpdateLabourInput = Partial<CreateLabourInput>

// Inputs accepted by POST /labour/bulk.
// Generates one entry per day in [startDate, endDate], optionally skipping
// weekends. All entries share the same employee / project / hours / etc.
export interface BulkCreateLabourInput {
  employeeId: string
  projectId: string
  startDate: string
  endDate: string
  hours: number
  labourTime: LabourTime
  labourType: LabourType
  objectiveEvidence: ObjectiveEvidence
  notes?: string | null
  skipWeekends?: boolean
}

export interface BulkCreateLabourResponse {
  created: number
  entries: LabourEntry[]
}

export interface LabourListResponse {
  entries: LabourEntryWithRelations[]
  total: number
}

export interface LabourEntryResponse {
  entry: LabourEntry
}

export interface LabourEntryWithRelationsResponse {
  entry: LabourEntryWithRelations
}
