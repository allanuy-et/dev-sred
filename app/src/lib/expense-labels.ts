import type { ExpenseEvidence, ExpenseType } from '@sred/shared'

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  materials: 'Materials',
  subcontract: 'Subcontract',
  travel: 'Travel',
  capital_90_rd: 'Capital (90% R&D)',
  other: 'Other',
}

export const EXPENSE_TYPES: ReadonlyArray<ExpenseType> = [
  'materials',
  'subcontract',
  'travel',
  'capital_90_rd',
  'other',
]

export const EXPENSE_EVIDENCE_LABELS: Record<ExpenseEvidence, string> = {
  none: 'None',
  invoice: 'Invoice',
  receipt: 'Receipt',
}

export const EXPENSE_EVIDENCES: ReadonlyArray<ExpenseEvidence> = [
  'none',
  'invoice',
  'receipt',
]
