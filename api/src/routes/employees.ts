import { Router } from 'express'
import bcrypt from 'bcrypt'
import type {
  AccessLevel,
  CreateEmployeeInput,
  PaidType,
  UpdateEmployeeInput,
  User,
} from '@sred/shared'
import { query } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()
router.use(requireAuth)

// --- Validation helpers (hand-written; no external library) ---

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
// Simple, intentionally lenient email regex — DB also stores as-is.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ACCESS_LEVELS = new Set<AccessLevel>(['admin', 'standard', 'limited'])
const PAID_TYPES = new Set<PaidType>(['hourly', 'salary'])
const STATUS_FILTERS = new Set(['active', 'inactive', 'all'])

const BCRYPT_ROUNDS = 10

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !ISO_DATE_RE.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime())
}

function isEmail(v: unknown): v is string {
  return typeof v === 'string' && EMAIL_RE.test(v) && v.length <= 320
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function isNonNegativeFiniteNumber(v: unknown): v is number {
  return isFiniteNumber(v) && v >= 0
}

function isNonNegativeInteger(v: unknown): v is number {
  return isFiniteNumber(v) && Number.isInteger(v) && v >= 0
}

// --- Row shape + mapper ---

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

// Centralized SELECT list so columns stay in sync with the row mapper.
const USER_SELECT = `
  u.id, u.company_id, u.email, u.first_name, u.last_name, u.role, u.access_level,
  u.start_date, u.paid, u.hours_per_year, u.regular_rate, u.overtime_rate, u.holiday_rate,
  u.specified_employee, u.qualifications, u.status, u.language, u.timezone,
  u.created_at, u.updated_at`

// Same list but for RETURNING after INSERT/UPDATE without a FROM clause —
// RETURNING runs against the target table directly and rejects aliases.
// Note: PATCH uses `UPDATE ... FROM users me`, where columns ARE ambiguous —
// that one uses the qualified `USER_SELECT` instead.
const USER_RETURNING = USER_SELECT.replace(/u\./g, '')

// --- Routes ---

router.get('/', async (req, res, next) => {
  try {
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : 'active'
    if (!STATUS_FILTERS.has(statusRaw)) {
      return res.status(400).json({ error: 'Invalid `status` (expected active|inactive|all)' })
    }

    const params: unknown[] = [req.user!.userId]
    let statusClause = ''
    if (statusRaw !== 'all') {
      params.push(statusRaw)
      statusClause = ` AND u.status = $${params.length}`
    }

    const result = await query<UserRow>(
      `SELECT ${USER_SELECT}
       FROM users u
       JOIN users me ON me.id = $1
       WHERE u.company_id = me.company_id${statusClause}
       ORDER BY u.last_name, u.first_name`,
      params
    )
    return res.json({ employees: result.rows.map(toUser) })
  } catch (err) {
    return next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })

    // Company-scope by joining on the caller's company_id. Mismatch -> no row -> 404.
    const result = await query<UserRow>(
      `SELECT ${USER_SELECT}
       FROM users u
       JOIN users me ON me.id = $1
       WHERE u.id = $2 AND u.company_id = me.company_id`,
      [req.user!.userId, req.params.id]
    )
    const row = result.rows[0]
    if (!row) return res.status(404).json({ error: 'Not found' })
    return res.json({ employee: toUser(row) })
  } catch (err) {
    return next(err)
  }
})

// Validate body for POST /employees. Returns parsed values + their applied defaults.
interface ParsedCreateEmployee {
  email: string
  password: string
  firstName: string
  lastName: string
  accessLevel: AccessLevel
  role: string | null
  startDate: string | null
  paid: PaidType
  hoursPerYear: number | null
  regularRate: number | null
  overtimeRate: number | null
  holidayRate: number | null
  specifiedEmployee: boolean | null
  qualifications: string | null
}

function parseCreateEmployee(
  body: unknown
): { ok: true; value: ParsedCreateEmployee } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be an object' }
  const b = body as Partial<Record<keyof CreateEmployeeInput, unknown>>

  if (!isEmail(b.email)) return { ok: false, error: 'Invalid `email`' }
  if (typeof b.password !== 'string' || b.password.length < 8) {
    return { ok: false, error: '`password` must be at least 8 characters' }
  }
  if (!isNonEmptyString(b.firstName)) return { ok: false, error: 'Invalid `firstName`' }
  if (!isNonEmptyString(b.lastName)) return { ok: false, error: 'Invalid `lastName`' }
  if (typeof b.accessLevel !== 'string' || !ACCESS_LEVELS.has(b.accessLevel as AccessLevel)) {
    return { ok: false, error: 'Invalid `accessLevel`' }
  }

  let role: string | null = null
  if ('role' in b) {
    if (b.role !== null && typeof b.role !== 'string') return { ok: false, error: 'Invalid `role`' }
    role = b.role ?? null
  }

  let startDate: string | null = null
  if ('startDate' in b) {
    if (b.startDate === null) startDate = null
    else if (!isIsoDate(b.startDate)) return { ok: false, error: 'Invalid `startDate`' }
    else startDate = b.startDate
  }

  let paid: PaidType = 'hourly'
  if ('paid' in b) {
    if (typeof b.paid !== 'string' || !PAID_TYPES.has(b.paid as PaidType)) {
      return { ok: false, error: 'Invalid `paid`' }
    }
    paid = b.paid as PaidType
  }

  let hoursPerYear: number | null = null
  if ('hoursPerYear' in b && b.hoursPerYear !== undefined) {
    if (!isNonNegativeInteger(b.hoursPerYear)) {
      return { ok: false, error: '`hoursPerYear` must be a non-negative integer' }
    }
    hoursPerYear = b.hoursPerYear
  }

  function parseRate(key: 'regularRate' | 'overtimeRate' | 'holidayRate'): number | null | { error: string } {
    if (!(key in b) || b[key] === undefined) return null
    if (!isNonNegativeFiniteNumber(b[key])) return { error: `\`${key}\` must be a non-negative number` }
    return b[key] as number
  }

  const reg = parseRate('regularRate')
  if (reg !== null && typeof reg === 'object') return { ok: false, error: reg.error }
  const ot = parseRate('overtimeRate')
  if (ot !== null && typeof ot === 'object') return { ok: false, error: ot.error }
  const hol = parseRate('holidayRate')
  if (hol !== null && typeof hol === 'object') return { ok: false, error: hol.error }

  let specifiedEmployee: boolean | null = null
  if ('specifiedEmployee' in b && b.specifiedEmployee !== undefined) {
    if (typeof b.specifiedEmployee !== 'boolean') {
      return { ok: false, error: '`specifiedEmployee` must be boolean' }
    }
    specifiedEmployee = b.specifiedEmployee
  }

  let qualifications: string | null = null
  if ('qualifications' in b) {
    if (b.qualifications !== null && typeof b.qualifications !== 'string') {
      return { ok: false, error: 'Invalid `qualifications`' }
    }
    qualifications = b.qualifications ?? null
  }

  return {
    ok: true,
    value: {
      email: b.email.toLowerCase(),
      password: b.password,
      firstName: b.firstName,
      lastName: b.lastName,
      accessLevel: b.accessLevel as AccessLevel,
      role,
      startDate,
      paid,
      hoursPerYear,
      regularRate: reg as number | null,
      overtimeRate: ot as number | null,
      holidayRate: hol as number | null,
      specifiedEmployee,
      qualifications,
    },
  }
}

// Postgres unique_violation error code.
const PG_UNIQUE_VIOLATION = '23505'
function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === PG_UNIQUE_VIOLATION
}

router.post('/', async (req, res, next) => {
  try {
    const parsed = parseCreateEmployee(req.body)
    if (!parsed.ok) return res.status(400).json({ error: parsed.error })
    const v = parsed.value

    // Caller's company is the company the new user gets created in.
    const me = await query<{ company_id: string }>(
      `SELECT company_id FROM users WHERE id = $1`,
      [req.user!.userId]
    )
    const companyId = me.rows[0]?.company_id
    if (!companyId) return res.status(401).json({ error: 'Not authenticated' })

    const passwordHash = await bcrypt.hash(v.password, BCRYPT_ROUNDS)

    // Build column/value list dynamically so DB defaults apply when caller omits.
    const cols: string[] = [
      'company_id',
      'email',
      'password_hash',
      'first_name',
      'last_name',
      'access_level',
    ]
    const vals: unknown[] = [
      companyId,
      v.email,
      passwordHash,
      v.firstName,
      v.lastName,
      v.accessLevel,
    ]
    // `maybe` skips both null and undefined; nullable columns then fall back to
    // their DB default (NULL or column-specific). That's the same end-state as
    // sending an explicit null, so we don't need a separate code path here.
    const maybe = (col: string, value: unknown) => {
      if (value === null || value === undefined) return
      cols.push(col)
      vals.push(value)
    }
    maybe('role', v.role)
    maybe('start_date', v.startDate)
    maybe('qualifications', v.qualifications)
    maybe('paid', v.paid)
    maybe('hours_per_year', v.hoursPerYear)
    maybe('regular_rate', v.regularRate)
    maybe('overtime_rate', v.overtimeRate)
    maybe('holiday_rate', v.holidayRate)
    maybe('specified_employee', v.specifiedEmployee)

    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ')

    try {
      const result = await query<UserRow>(
        `INSERT INTO users (${cols.join(', ')})
         VALUES (${placeholders})
         RETURNING ${USER_RETURNING}`,
        vals
      )
      return res.status(201).json({ employee: toUser(result.rows[0]) })
    } catch (err) {
      if (isUniqueViolation(err)) {
        return res.status(409).json({ error: 'Email already in use' })
      }
      throw err
    }
  } catch (err) {
    return next(err)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Body must be an object' })
    }
    const b = req.body as Partial<Record<keyof UpdateEmployeeInput, unknown>>

    const sets: string[] = []
    const params: unknown[] = []
    const push = (sql: string, value: unknown) => {
      params.push(value)
      sets.push(`${sql} = $${params.length}`)
    }

    if ('email' in b) {
      if (!isEmail(b.email)) return res.status(400).json({ error: 'Invalid `email`' })
      push('email', (b.email as string).toLowerCase())
    }
    if ('firstName' in b) {
      if (!isNonEmptyString(b.firstName)) return res.status(400).json({ error: 'Invalid `firstName`' })
      push('first_name', b.firstName)
    }
    if ('lastName' in b) {
      if (!isNonEmptyString(b.lastName)) return res.status(400).json({ error: 'Invalid `lastName`' })
      push('last_name', b.lastName)
    }
    if ('accessLevel' in b) {
      if (typeof b.accessLevel !== 'string' || !ACCESS_LEVELS.has(b.accessLevel as AccessLevel)) {
        return res.status(400).json({ error: 'Invalid `accessLevel`' })
      }
      push('access_level', b.accessLevel)
    }
    if ('role' in b) {
      if (b.role !== null && typeof b.role !== 'string') return res.status(400).json({ error: 'Invalid `role`' })
      push('role', b.role ?? null)
    }
    if ('startDate' in b) {
      if (b.startDate !== null && !isIsoDate(b.startDate)) {
        return res.status(400).json({ error: 'Invalid `startDate`' })
      }
      push('start_date', b.startDate ?? null)
    }
    if ('paid' in b) {
      if (typeof b.paid !== 'string' || !PAID_TYPES.has(b.paid as PaidType)) {
        return res.status(400).json({ error: 'Invalid `paid`' })
      }
      push('paid', b.paid)
    }
    if ('hoursPerYear' in b) {
      if (!isNonNegativeInteger(b.hoursPerYear)) {
        return res.status(400).json({ error: '`hoursPerYear` must be a non-negative integer' })
      }
      push('hours_per_year', b.hoursPerYear)
    }
    if ('regularRate' in b) {
      if (!isNonNegativeFiniteNumber(b.regularRate)) {
        return res.status(400).json({ error: '`regularRate` must be a non-negative number' })
      }
      push('regular_rate', b.regularRate)
    }
    if ('overtimeRate' in b) {
      if (!isNonNegativeFiniteNumber(b.overtimeRate)) {
        return res.status(400).json({ error: '`overtimeRate` must be a non-negative number' })
      }
      push('overtime_rate', b.overtimeRate)
    }
    if ('holidayRate' in b) {
      if (!isNonNegativeFiniteNumber(b.holidayRate)) {
        return res.status(400).json({ error: '`holidayRate` must be a non-negative number' })
      }
      push('holiday_rate', b.holidayRate)
    }
    if ('specifiedEmployee' in b) {
      if (typeof b.specifiedEmployee !== 'boolean') {
        return res.status(400).json({ error: '`specifiedEmployee` must be boolean' })
      }
      push('specified_employee', b.specifiedEmployee)
    }
    if ('qualifications' in b) {
      if (b.qualifications !== null && typeof b.qualifications !== 'string') {
        return res.status(400).json({ error: 'Invalid `qualifications`' })
      }
      push('qualifications', b.qualifications ?? null)
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' })
    }

    sets.push(`updated_at = now()`)
    params.push(req.params.id)
    const idIdx = params.length
    params.push(req.user!.userId)
    const meIdx = params.length

    try {
      // Company-scope: UPDATE only applies when the target row's company matches caller's.
      // Note: with `FROM users me` joined in, `id`, `company_id` etc. are ambiguous
      // between `u.*` and `me.*` — use the qualified USER_SELECT in RETURNING.
      const result = await query<UserRow>(
        `UPDATE users u
         SET ${sets.join(', ')}
         FROM users me
         WHERE u.id = $${idIdx} AND me.id = $${meIdx} AND u.company_id = me.company_id
         RETURNING ${USER_SELECT}`,
        params
      )
      const row = result.rows[0]
      if (!row) return res.status(404).json({ error: 'Not found' })
      return res.json({ employee: toUser(row) })
    } catch (err) {
      if (isUniqueViolation(err)) {
        return res.status(409).json({ error: 'Email already in use' })
      }
      throw err
    }
  } catch (err) {
    return next(err)
  }
})

// Helper for deactivate/reactivate: only flip status, scoped to caller's company.
async function setEmployeeStatus(
  userId: string,
  callerId: string,
  status: 'active' | 'inactive'
): Promise<boolean> {
  const result = await query(
    `UPDATE users u
     SET status = $1, updated_at = now()
     FROM users me
     WHERE u.id = $2 AND me.id = $3 AND u.company_id = me.company_id`,
    [status, userId, callerId]
  )
  return (result.rowCount ?? 0) > 0
}

router.post('/:id/deactivate', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })
    const ok = await setEmployeeStatus(req.params.id, req.user!.userId, 'inactive')
    if (!ok) return res.status(404).json({ error: 'Not found' })
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

router.post('/:id/reactivate', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })
    const ok = await setEmployeeStatus(req.params.id, req.user!.userId, 'active')
    if (!ok) return res.status(404).json({ error: 'Not found' })
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

export default router
