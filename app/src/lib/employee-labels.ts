import type { AccessLevel, PaidType } from '@sred/shared'

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  admin: 'Administrator',
  standard: 'Standard User',
  limited: 'Limited User',
}

export const ACCESS_LEVELS: ReadonlyArray<AccessLevel> = [
  'admin',
  'standard',
  'limited',
]

export const PAID_TYPE_LABELS: Record<PaidType, string> = {
  hourly: 'Hourly',
  salary: 'Salary',
}

export const PAID_TYPES: ReadonlyArray<PaidType> = ['hourly', 'salary']
