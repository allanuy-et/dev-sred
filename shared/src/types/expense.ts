export type ExpenseType =
  | 'materials'
  | 'subcontract'
  | 'travel'
  | 'capital_90_rd'
  | 'other'
export type ExpenseEvidence = 'none' | 'invoice' | 'receipt'

export interface Expense {
  id: string
  date: string
  employeeId: string
  projectId: string
  cost: number
  poNumber: string | null
  type: ExpenseType
  objectiveEvidence: ExpenseEvidence
  notes: string | null
  filePath: string | null
  createdAt: string
  updatedAt: string
}

import type { Attachment } from './labour.js'

export interface ExpenseWithRelations extends Expense {
  employeeName: string
  projectName: string
  attachments: Attachment[]
}

// Inputs accepted by POST /expenses and PATCH /expenses/:id.
// Server validates these — do not trust the shapes blindly.
export interface CreateExpenseInput {
  date: string
  employeeId: string
  projectId: string
  cost: number
  poNumber?: string | null
  type: ExpenseType
  objectiveEvidence?: ExpenseEvidence
  notes?: string | null
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>

export interface ExpenseListResponse {
  entries: ExpenseWithRelations[]
  total: number
}

export interface ExpenseResponse {
  entry: Expense
}

export interface ExpenseWithRelationsResponse {
  entry: ExpenseWithRelations
}
