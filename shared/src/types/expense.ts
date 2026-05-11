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

export interface ExpenseWithRelations extends Expense {
  employeeName: string
  projectName: string
}
