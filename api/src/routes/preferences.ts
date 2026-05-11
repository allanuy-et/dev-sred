import { Router } from 'express'
import type {
  Company,
  CompanyPreferencesInput,
  SessionUser,
  UserPreferencesInput,
} from '@sred/shared'
import { SUPPORTED_LANGUAGES, SUPPORTED_TIMEZONES } from '@sred/shared'
import { query } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()
router.use(requireAuth)

// --- Validation helpers (hand-written; no external library) ---

const ROLE_MAX_LEN = 120

function isSupportedTimezone(v: unknown): v is string {
  return typeof v === 'string' && SUPPORTED_TIMEZONES.some((t) => t.value === v)
}

function isSupportedLanguage(v: unknown): v is string {
  return typeof v === 'string' && SUPPORTED_LANGUAGES.some((l) => l.value === v)
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

// --- Row shapes + mappers ---

interface SessionUserRow {
  id: string
  email: string
  first_name: string
  last_name: string
  access_level: 'admin' | 'standard' | 'limited'
  timezone: string
  language: string
}

function toSessionUser(row: SessionUserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    accessLevel: row.access_level,
    timezone: row.timezone,
    language: row.language,
  }
}

const SESSION_USER_SELECT = `id, email, first_name, last_name, access_level, timezone, language`

interface CompanyRow {
  id: string
  name: string
  business_number: string | null
  address1: string | null
  address2: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  phone1: string | null
  phone2: string | null
  fax: string | null
  email: string | null
  website: string | null
  fiscal_year_end: string | null
  financial_contact: string | null
  technical_contact: string | null
  timezone: string
  created_at: Date | string
  updated_at: Date | string
}

function toIsoTs(v: Date | string): string {
  return typeof v === 'string' ? new Date(v).toISOString() : v.toISOString()
}

function toCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    businessNumber: row.business_number,
    address1: row.address1,
    address2: row.address2,
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    phone1: row.phone1,
    phone2: row.phone2,
    fax: row.fax,
    email: row.email,
    website: row.website,
    fiscalYearEnd: row.fiscal_year_end,
    financialContact: row.financial_contact,
    technicalContact: row.technical_contact,
    timezone: row.timezone,
    createdAt: toIsoTs(row.created_at),
    updatedAt: toIsoTs(row.updated_at),
  }
}

const COMPANY_SELECT = `
  c.id, c.name, c.business_number, c.address1, c.address2, c.city, c.province, c.postal_code,
  c.phone1, c.phone2, c.fax, c.email, c.website, c.fiscal_year_end, c.financial_contact,
  c.technical_contact, c.timezone, c.created_at, c.updated_at`

// --- Routes ---

// GET /preferences/user — same payload as /auth/me, but exposed under
// /preferences so the prefs page can fetch its own data without coupling
// to the auth router.
router.get('/user', async (req, res, next) => {
  try {
    const result = await query<SessionUserRow>(
      `SELECT ${SESSION_USER_SELECT} FROM users WHERE id = $1`,
      [req.user!.userId]
    )
    const row = result.rows[0]
    if (!row) return res.status(401).json({ error: 'Not authenticated' })
    return res.json({ user: toSessionUser(row) })
  } catch (err) {
    return next(err)
  }
})

// PATCH /preferences/user — updates only the calling user's row.
router.patch('/user', async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Body must be an object' })
    }
    const b = req.body as Partial<Record<keyof UserPreferencesInput, unknown>>

    const sets: string[] = []
    const params: unknown[] = []
    const push = (sql: string, value: unknown) => {
      params.push(value)
      sets.push(`${sql} = $${params.length}`)
    }

    if ('role' in b) {
      if (b.role !== null && typeof b.role !== 'string') {
        return res.status(400).json({ error: 'Invalid `role`' })
      }
      if (typeof b.role === 'string' && b.role.length > ROLE_MAX_LEN) {
        return res.status(400).json({ error: '`role` is too long' })
      }
      push('role', b.role ?? null)
    }
    if ('timezone' in b) {
      if (!isSupportedTimezone(b.timezone)) {
        return res.status(400).json({ error: 'Invalid `timezone`' })
      }
      push('timezone', b.timezone)
    }
    if ('language' in b) {
      if (!isSupportedLanguage(b.language)) {
        return res.status(400).json({ error: 'Invalid `language`' })
      }
      push('language', b.language)
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' })
    }

    sets.push(`updated_at = now()`)
    params.push(req.user!.userId)
    const idIdx = params.length

    const result = await query<SessionUserRow>(
      `UPDATE users
       SET ${sets.join(', ')}
       WHERE id = $${idIdx}
       RETURNING ${SESSION_USER_SELECT}`,
      params
    )
    const row = result.rows[0]
    if (!row) return res.status(401).json({ error: 'Not authenticated' })
    return res.json({ user: toSessionUser(row) })
  } catch (err) {
    return next(err)
  }
})

// GET /preferences/company — any authed user in the company can read.
router.get('/company', async (req, res, next) => {
  try {
    const result = await query<CompanyRow>(
      `SELECT ${COMPANY_SELECT}
       FROM companies c
       JOIN users me ON me.id = $1
       WHERE c.id = me.company_id`,
      [req.user!.userId]
    )
    const row = result.rows[0]
    if (!row) return res.status(404).json({ error: 'Not found' })
    return res.json({ company: toCompany(row) })
  } catch (err) {
    return next(err)
  }
})

// PATCH /preferences/company — admin only.
router.patch('/company', async (req, res, next) => {
  try {
    if (req.user!.accessLevel !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Body must be an object' })
    }
    const b = req.body as Partial<Record<keyof CompanyPreferencesInput, unknown>>

    const sets: string[] = []
    const params: unknown[] = []
    const push = (sql: string, value: unknown) => {
      params.push(value)
      sets.push(`${sql} = $${params.length}`)
    }

    if ('name' in b) {
      // Non-nullable column: must be a non-empty string.
      if (!isNonEmptyString(b.name)) return res.status(400).json({ error: 'Invalid `name`' })
      push('name', (b.name as string).trim())
    }

    // Nullable free-text fields: accept null (clear) or a string (trim & store).
    const nullableTextFields: Array<[keyof CompanyPreferencesInput, string]> = [
      ['businessNumber', 'business_number'],
      ['address1', 'address1'],
      ['address2', 'address2'],
      ['city', 'city'],
      ['province', 'province'],
      ['postalCode', 'postal_code'],
      ['phone1', 'phone1'],
      ['phone2', 'phone2'],
      ['fax', 'fax'],
      ['email', 'email'],
      ['website', 'website'],
      ['fiscalYearEnd', 'fiscal_year_end'],
      ['financialContact', 'financial_contact'],
      ['technicalContact', 'technical_contact'],
    ]
    for (const [key, column] of nullableTextFields) {
      if (!(key in b)) continue
      const v = b[key]
      if (v === null) {
        push(column, null)
      } else if (typeof v === 'string') {
        push(column, v.trim())
      } else {
        return res.status(400).json({ error: `Invalid \`${String(key)}\`` })
      }
    }

    if ('timezone' in b) {
      if (!isSupportedTimezone(b.timezone)) {
        return res.status(400).json({ error: 'Invalid `timezone`' })
      }
      push('timezone', b.timezone)
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' })
    }

    sets.push(`updated_at = now()`)
    params.push(req.user!.userId)
    const meIdx = params.length

    // Company-scope: UPDATE only the company the caller belongs to. The
    // `FROM users me` join makes c.* unambiguous, so use the aliased SELECT.
    const result = await query<CompanyRow>(
      `UPDATE companies c
       SET ${sets.join(', ')}
       FROM users me
       WHERE me.id = $${meIdx} AND c.id = me.company_id
       RETURNING ${COMPANY_SELECT}`,
      params
    )
    const row = result.rows[0]
    if (!row) return res.status(404).json({ error: 'Not found' })
    return res.json({ company: toCompany(row) })
  } catch (err) {
    return next(err)
  }
})

export default router
