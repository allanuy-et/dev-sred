import { Router } from 'express'
import type {
  CreateExpenseInput,
  Expense,
  ExpenseEvidence,
  ExpenseType,
  ExpenseWithRelations,
  UpdateExpenseInput,
} from '@sred/shared'
import { query } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

router.use(requireAuth)

// --- Validation helpers (hand-written; no external library) ---

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const EXPENSE_TYPES = new Set<ExpenseType>([
  'materials',
  'subcontract',
  'travel',
  'capital_90_rd',
  'other',
])
const EXPENSE_EVIDENCE_VALUES = new Set<ExpenseEvidence>(['none', 'invoice', 'receipt'])

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !ISO_DATE_RE.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime())
}

function isValidCost(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0
}

// Escape ILIKE wildcards so user input can't act as wildcards.
function escapeIlikeWildcards(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

// --- Row shape + mappers ---

interface ExpenseRow {
  id: string
  date: Date | string
  employee_id: string
  project_id: string
  cost: string // NUMERIC returns string
  po_number: string | null
  type: ExpenseType
  objective_evidence: ExpenseEvidence
  notes: string | null
  file_path: string | null
  created_at: Date | string
  updated_at: Date | string
}

interface ExpenseRowWithRelations extends ExpenseRow {
  employee_first_name: string
  employee_last_name: string
  project_name: string
}

function toIsoDate(v: Date | string): string {
  if (typeof v === 'string') return v.length >= 10 ? v.slice(0, 10) : v
  // pg returns DATE columns as a Date pinned to local midnight; use UTC parts
  // to avoid off-by-one when the server is east of UTC.
  const y = v.getUTCFullYear()
  const m = String(v.getUTCMonth() + 1).padStart(2, '0')
  const d = String(v.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toIsoTimestamp(v: Date | string): string {
  return typeof v === 'string' ? new Date(v).toISOString() : v.toISOString()
}

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    date: toIsoDate(row.date),
    employeeId: row.employee_id,
    projectId: row.project_id,
    cost: Number(row.cost),
    poNumber: row.po_number,
    type: row.type,
    objectiveEvidence: row.objective_evidence,
    notes: row.notes,
    filePath: row.file_path,
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
  }
}

function toExpenseWithRelations(row: ExpenseRowWithRelations): ExpenseWithRelations {
  return {
    ...toExpense(row),
    employeeName: `${row.employee_first_name} ${row.employee_last_name}`.trim(),
    projectName: row.project_name,
  }
}

// SELECT lists kept centralized so column names stay in sync with mappers.
const EXPENSE_SELECT = `
  e.id, e.date, e.employee_id, e.project_id, e.cost, e.po_number, e.type,
  e.objective_evidence, e.notes, e.file_path, e.created_at, e.updated_at`

const EXPENSE_SELECT_WITH_RELATIONS = `
  ${EXPENSE_SELECT},
  u.first_name AS employee_first_name,
  u.last_name  AS employee_last_name,
  p.name       AS project_name`

// Verify (employeeId, projectId) exist AND belong to the caller's company.
// Cross-tenant returns the same "does not exist" error to avoid leaking row existence.
async function verifyForeignKeysInCompany(
  employeeId: string,
  projectId: string,
  companyId: string
): Promise<string | null> {
  const res = await query<{ employee_exists: boolean; project_exists: boolean }>(
    `SELECT
       EXISTS(SELECT 1 FROM users    WHERE id = $1 AND company_id = $3) AS employee_exists,
       EXISTS(SELECT 1 FROM projects WHERE id = $2 AND company_id = $3) AS project_exists`,
    [employeeId, projectId, companyId]
  )
  const row = res.rows[0]
  if (!row?.employee_exists) return 'employeeId does not exist'
  if (!row?.project_exists) return 'projectId does not exist'
  return null
}

// --- Routes ---

router.get('/', async (req, res, next) => {
  try {
    const { from, to, projectId, employeeId } = req.query
    const limitRaw = Number(req.query.limit ?? 50)
    const offsetRaw = Number(req.query.offset ?? 0)
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 500 ? Math.floor(limitRaw) : 50
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0

    // Company-scoping: first param is always caller's user id, joined as `me`.
    const params: unknown[] = [req.user!.userId]
    const where: string[] = ['p.company_id = me.company_id']

    if (typeof from === 'string') {
      if (!isIsoDate(from)) return res.status(400).json({ error: 'Invalid `from` date' })
      params.push(from)
      where.push(`e.date >= $${params.length}`)
    }
    if (typeof to === 'string') {
      if (!isIsoDate(to)) return res.status(400).json({ error: 'Invalid `to` date' })
      params.push(to)
      where.push(`e.date <= $${params.length}`)
    }
    if (typeof projectId === 'string') {
      if (!isUuid(projectId)) return res.status(400).json({ error: 'Invalid `projectId`' })
      params.push(projectId)
      where.push(`e.project_id = $${params.length}`)
    }
    if (typeof employeeId === 'string') {
      if (!isUuid(employeeId)) return res.status(400).json({ error: 'Invalid `employeeId`' })
      params.push(employeeId)
      where.push(`e.employee_id = $${params.length}`)
    }
    // ?q= free-text search on notes + po_number: ignore silently if missing / <2 chars after trim.
    if (typeof req.query.q === 'string') {
      const trimmed = req.query.q.trim()
      if (trimmed.length >= 2) {
        params.push(`%${escapeIlikeWildcards(trimmed)}%`)
        const idx = params.length
        where.push(`(COALESCE(e.notes, '') ILIKE $${idx} OR COALESCE(e.po_number, '') ILIKE $${idx})`)
      }
    }

    const whereSql = `WHERE ${where.join(' AND ')}`

    // Total count uses the same filters but no limit/offset.
    const totalRes = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM expenses e
       JOIN users u    ON u.id = e.employee_id
       JOIN projects p ON p.id = e.project_id
       JOIN users me   ON me.id = $1
       ${whereSql}`,
      params
    )
    const total = Number(totalRes.rows[0]?.total ?? 0)

    params.push(limit)
    const limitIdx = params.length
    params.push(offset)
    const offsetIdx = params.length

    const rows = await query<ExpenseRowWithRelations>(
      `SELECT ${EXPENSE_SELECT_WITH_RELATIONS}
       FROM expenses e
       JOIN users u    ON u.id = e.employee_id
       JOIN projects p ON p.id = e.project_id
       JOIN users me   ON me.id = $1
       ${whereSql}
       ORDER BY e.date DESC, e.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    )

    return res.json({
      entries: rows.rows.map(toExpenseWithRelations),
      total,
    })
  } catch (err) {
    return next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })

    // Company-scope: row only visible if its project belongs to caller's company.
    const result = await query<ExpenseRowWithRelations>(
      `SELECT ${EXPENSE_SELECT_WITH_RELATIONS}
       FROM expenses e
       JOIN users u    ON u.id = e.employee_id
       JOIN projects p ON p.id = e.project_id
       JOIN users me   ON me.id = $1
       WHERE e.id = $2 AND p.company_id = me.company_id`,
      [req.user!.userId, req.params.id]
    )
    const row = result.rows[0]
    if (!row) return res.status(404).json({ error: 'Not found' })
    return res.json({ entry: toExpenseWithRelations(row) })
  } catch (err) {
    return next(err)
  }
})

// Validate and extract a CreateExpenseInput from arbitrary body.
interface ParsedCreateExpense {
  date: string
  employeeId: string
  projectId: string
  cost: number
  poNumber: string | null
  type: ExpenseType
  objectiveEvidence: ExpenseEvidence
  notes: string | null
}

function parseCreateExpense(
  body: unknown
): { ok: true; value: ParsedCreateExpense } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be an object' }
  const b = body as Partial<Record<keyof CreateExpenseInput, unknown>>

  if (!isIsoDate(b.date)) return { ok: false, error: 'Invalid `date` (expected YYYY-MM-DD)' }
  if (!isUuid(b.employeeId)) return { ok: false, error: 'Invalid `employeeId`' }
  if (!isUuid(b.projectId)) return { ok: false, error: 'Invalid `projectId`' }
  if (!isValidCost(b.cost)) return { ok: false, error: '`cost` must be a number >= 0' }
  if (typeof b.type !== 'string' || !EXPENSE_TYPES.has(b.type as ExpenseType)) {
    return { ok: false, error: 'Invalid `type`' }
  }

  let objectiveEvidence: ExpenseEvidence = 'none'
  if ('objectiveEvidence' in b && b.objectiveEvidence !== undefined) {
    if (
      typeof b.objectiveEvidence !== 'string' ||
      !EXPENSE_EVIDENCE_VALUES.has(b.objectiveEvidence as ExpenseEvidence)
    ) {
      return { ok: false, error: 'Invalid `objectiveEvidence`' }
    }
    objectiveEvidence = b.objectiveEvidence as ExpenseEvidence
  }

  let poNumber: string | null = null
  if ('poNumber' in b) {
    if (b.poNumber !== null && typeof b.poNumber !== 'string') {
      return { ok: false, error: 'Invalid `poNumber`' }
    }
    poNumber = b.poNumber ?? null
  }

  let notes: string | null = null
  if ('notes' in b) {
    if (b.notes !== null && typeof b.notes !== 'string') {
      return { ok: false, error: 'Invalid `notes`' }
    }
    notes = b.notes ?? null
  }

  return {
    ok: true,
    value: {
      date: b.date,
      employeeId: b.employeeId,
      projectId: b.projectId,
      cost: b.cost,
      poNumber,
      type: b.type as ExpenseType,
      objectiveEvidence,
      notes,
    },
  }
}

router.post('/', async (req, res, next) => {
  try {
    const parsed = parseCreateExpense(req.body)
    if (!parsed.ok) return res.status(400).json({ error: parsed.error })
    const v = parsed.value

    const me = await query<{ company_id: string }>(
      `SELECT company_id FROM users WHERE id = $1`,
      [req.user!.userId]
    )
    const companyId = me.rows[0]?.company_id
    if (!companyId) return res.status(401).json({ error: 'Not authenticated' })

    const fkErr = await verifyForeignKeysInCompany(v.employeeId, v.projectId, companyId)
    if (fkErr) return res.status(400).json({ error: fkErr })

    const result = await query<ExpenseRow>(
      `INSERT INTO expenses
        (date, employee_id, project_id, cost, po_number, type, objective_evidence, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${EXPENSE_SELECT.replace(/e\./g, '')}`,
      [
        v.date,
        v.employeeId,
        v.projectId,
        v.cost,
        v.poNumber,
        v.type,
        v.objectiveEvidence,
        v.notes,
      ]
    )
    return res.status(201).json({ entry: toExpense(result.rows[0]) })
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
    const b = req.body as Partial<Record<keyof UpdateExpenseInput, unknown>>

    // Caller's company up front for company-scoped update + FK checks.
    const me = await query<{ company_id: string }>(
      `SELECT company_id FROM users WHERE id = $1`,
      [req.user!.userId]
    )
    const companyId = me.rows[0]?.company_id
    if (!companyId) return res.status(401).json({ error: 'Not authenticated' })

    // Build SET clause from the provided fields, validating each.
    const sets: string[] = []
    const params: unknown[] = []
    const push = (sql: string, value: unknown) => {
      params.push(value)
      sets.push(`${sql} = $${params.length}`)
    }

    if ('date' in b) {
      if (!isIsoDate(b.date)) return res.status(400).json({ error: 'Invalid `date`' })
      push('date', b.date)
    }
    if ('employeeId' in b) {
      if (!isUuid(b.employeeId)) return res.status(400).json({ error: 'Invalid `employeeId`' })
      push('employee_id', b.employeeId)
    }
    if ('projectId' in b) {
      if (!isUuid(b.projectId)) return res.status(400).json({ error: 'Invalid `projectId`' })
      push('project_id', b.projectId)
    }
    if ('cost' in b) {
      if (!isValidCost(b.cost)) return res.status(400).json({ error: '`cost` must be a number >= 0' })
      push('cost', b.cost)
    }
    if ('poNumber' in b) {
      if (b.poNumber !== null && typeof b.poNumber !== 'string') {
        return res.status(400).json({ error: 'Invalid `poNumber`' })
      }
      push('po_number', b.poNumber ?? null)
    }
    if ('type' in b) {
      if (typeof b.type !== 'string' || !EXPENSE_TYPES.has(b.type as ExpenseType)) {
        return res.status(400).json({ error: 'Invalid `type`' })
      }
      push('type', b.type)
    }
    if ('objectiveEvidence' in b) {
      if (
        typeof b.objectiveEvidence !== 'string' ||
        !EXPENSE_EVIDENCE_VALUES.has(b.objectiveEvidence as ExpenseEvidence)
      ) {
        return res.status(400).json({ error: 'Invalid `objectiveEvidence`' })
      }
      push('objective_evidence', b.objectiveEvidence)
    }
    if ('notes' in b) {
      if (b.notes !== null && typeof b.notes !== 'string') {
        return res.status(400).json({ error: 'Invalid `notes`' })
      }
      push('notes', b.notes ?? null)
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' })
    }

    // First, fetch the current row scoped to caller's company so we can
    // (a) emit a clean 404 on cross-tenant access, and
    // (b) fill in whichever FK wasn't being updated for the in-company check.
    const current = await query<{ employee_id: string; project_id: string }>(
      `SELECT e.employee_id, e.project_id
       FROM expenses e
       JOIN projects p ON p.id = e.project_id
       WHERE e.id = $1 AND p.company_id = $2`,
      [req.params.id, companyId]
    )
    const currentRow = current.rows[0]
    if (!currentRow) return res.status(404).json({ error: 'Not found' })

    // If FK columns changed, verify the new references exist inside caller's company.
    if ('employeeId' in b || 'projectId' in b) {
      const fkErr = await verifyForeignKeysInCompany(
        (b.employeeId as string | undefined) ?? currentRow.employee_id,
        (b.projectId as string | undefined) ?? currentRow.project_id,
        companyId
      )
      if (fkErr) return res.status(400).json({ error: fkErr })
    }

    sets.push(`updated_at = now()`)
    params.push(req.params.id)
    const result = await query<ExpenseRow>(
      `UPDATE expenses
       SET ${sets.join(', ')}
       WHERE id = $${params.length}
       RETURNING ${EXPENSE_SELECT.replace(/e\./g, '')}`,
      params
    )
    const row = result.rows[0]
    if (!row) return res.status(404).json({ error: 'Not found' })
    return res.json({ entry: toExpense(row) })
  } catch (err) {
    return next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })

    // Company-scoped delete: only delete if expense's project belongs to caller's company.
    const result = await query(
      `DELETE FROM expenses e
       USING projects p, users me
       WHERE e.id = $1
         AND p.id = e.project_id
         AND me.id = $2
         AND p.company_id = me.company_id`,
      [req.params.id, req.user!.userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

export default router
