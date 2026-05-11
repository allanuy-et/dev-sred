import { Router } from 'express'
import type { AccessLevel, PaidType, User } from '@sred/shared'
import { query } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()
router.use(requireAuth)

interface UserRow {
  id: string
  company_id: string
  email: string
  first_name: string
  last_name: string
  role: string | null
  access_level: AccessLevel
  start_date: Date | string | null
  paid: PaidType
  hours_per_year: number
  regular_rate: string
  overtime_rate: string
  holiday_rate: string
  specified_employee: boolean
  qualifications: string | null
  status: 'active' | 'inactive'
  language: string
  timezone: string
  created_at: Date | string
  updated_at: Date | string
}

function toIsoDate(v: Date | string | null): string | null {
  if (v === null) return null
  if (typeof v === 'string') return v.length >= 10 ? v.slice(0, 10) : v
  const y = v.getUTCFullYear()
  const m = String(v.getUTCMonth() + 1).padStart(2, '0')
  const d = String(v.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toIsoTs(v: Date | string): string {
  return typeof v === 'string' ? new Date(v).toISOString() : v.toISOString()
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    accessLevel: row.access_level,
    companyId: row.company_id,
    startDate: toIsoDate(row.start_date),
    paid: row.paid,
    hoursPerYear: row.hours_per_year,
    regularRate: Number(row.regular_rate),
    overtimeRate: Number(row.overtime_rate),
    holidayRate: Number(row.holiday_rate),
    specifiedEmployee: row.specified_employee,
    qualifications: row.qualifications,
    status: row.status,
    language: row.language,
    timezone: row.timezone,
    createdAt: toIsoTs(row.created_at),
    updatedAt: toIsoTs(row.updated_at),
  }
}

router.get('/', async (req, res, next) => {
  try {
    const result = await query<UserRow>(
      `SELECT u.id, u.company_id, u.email, u.first_name, u.last_name, u.role, u.access_level,
              u.start_date, u.paid, u.hours_per_year, u.regular_rate, u.overtime_rate, u.holiday_rate,
              u.specified_employee, u.qualifications, u.status, u.language, u.timezone,
              u.created_at, u.updated_at
       FROM users u
       JOIN users me ON me.id = $1
       WHERE u.company_id = me.company_id AND u.status = 'active'
       ORDER BY u.last_name, u.first_name`,
      [req.user!.userId]
    )
    return res.json({ employees: result.rows.map(toUser) })
  } catch (err) {
    return next(err)
  }
})

export default router
