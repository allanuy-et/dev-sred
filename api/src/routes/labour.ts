import { Router } from 'express'
import type {
  LabourEntry,
  LabourEntryWithRelations,
  LabourTime,
  LabourType,
  ObjectiveEvidence,
} from '@sred/shared'
import { query } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

router.use(requireAuth)

// --- Validation helpers (hand-written; no external library) ---

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const LABOUR_TIMES = new Set<LabourTime>(['regular', 'overtime', 'double'])
const LABOUR_TYPES = new Set<LabourType>([
  'alpha_test',
  'beta_test',
  'programming',
  'test_and_measurement',
  'design_modifications',
  'analysis',
  'other',
])
const OBJECTIVE_EVIDENCE_VALUES = new Set<ObjectiveEvidence>([
  'none',
  'design_of_experiments',
  'test_records',
  'progress_reports',
])

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !ISO_DATE_RE.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime())
}

function isValidHours(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 24
}

// --- Row mappers ---

interface LabourRow {
  id: string
  date: Date | string
  employee_id: string
  project_id: string
  hours: string // NUMERIC returns string
  labour_time: LabourTime
  labour_type: LabourType
  objective_evidence: ObjectiveEvidence
  notes: string | null
  file_path: string | null
  created_at: Date | string
  updated_at: Date | string
}

interface LabourRowWithRelations extends LabourRow {
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

function toLabourEntry(row: LabourRow): LabourEntry {
  return {
    id: row.id,
    date: toIsoDate(row.date),
    employeeId: row.employee_id,
    projectId: row.project_id,
    hours: Number(row.hours),
    labourTime: row.labour_time,
    labourType: row.labour_type,
    objectiveEvidence: row.objective_evidence,
    notes: row.notes,
    filePath: row.file_path,
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
  }
}

function toLabourEntryWithRelations(row: LabourRowWithRelations): LabourEntryWithRelations {
  return {
    ...toLabourEntry(row),
    employeeName: `${row.employee_first_name} ${row.employee_last_name}`.trim(),
    projectName: row.project_name,
  }
}

// SELECT lists kept centralized so column names stay in sync with mappers.
const LABOUR_SELECT = `
  l.id, l.date, l.employee_id, l.project_id, l.hours, l.labour_time, l.labour_type,
  l.objective_evidence, l.notes, l.file_path, l.created_at, l.updated_at`

const LABOUR_SELECT_WITH_RELATIONS = `
  ${LABOUR_SELECT},
  u.first_name AS employee_first_name,
  u.last_name  AS employee_last_name,
  p.name       AS project_name`

// --- Routes ---

router.get('/', async (req, res, next) => {
  try {
    const { from, to, projectId, employeeId } = req.query
    const limitRaw = Number(req.query.limit ?? 50)
    const offsetRaw = Number(req.query.offset ?? 0)
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 500 ? Math.floor(limitRaw) : 50
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0

    const where: string[] = []
    const params: unknown[] = []

    if (typeof from === 'string') {
      if (!isIsoDate(from)) return res.status(400).json({ error: 'Invalid `from` date' })
      params.push(from)
      where.push(`l.date >= $${params.length}`)
    }
    if (typeof to === 'string') {
      if (!isIsoDate(to)) return res.status(400).json({ error: 'Invalid `to` date' })
      params.push(to)
      where.push(`l.date <= $${params.length}`)
    }
    if (typeof projectId === 'string') {
      if (!isUuid(projectId)) return res.status(400).json({ error: 'Invalid `projectId`' })
      params.push(projectId)
      where.push(`l.project_id = $${params.length}`)
    }
    if (typeof employeeId === 'string') {
      if (!isUuid(employeeId)) return res.status(400).json({ error: 'Invalid `employeeId`' })
      params.push(employeeId)
      where.push(`l.employee_id = $${params.length}`)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    // Total count uses the same filters but no limit/offset.
    const totalRes = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM labour_entries l ${whereSql}`,
      params
    )
    const total = Number(totalRes.rows[0]?.total ?? 0)

    params.push(limit)
    const limitIdx = params.length
    params.push(offset)
    const offsetIdx = params.length

    const rows = await query<LabourRowWithRelations>(
      `SELECT ${LABOUR_SELECT_WITH_RELATIONS}
       FROM labour_entries l
       JOIN users u    ON u.id = l.employee_id
       JOIN projects p ON p.id = l.project_id
       ${whereSql}
       ORDER BY l.date DESC, l.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    )

    return res.json({
      entries: rows.rows.map(toLabourEntryWithRelations),
      total,
    })
  } catch (err) {
    return next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })

    const result = await query<LabourRowWithRelations>(
      `SELECT ${LABOUR_SELECT_WITH_RELATIONS}
       FROM labour_entries l
       JOIN users u    ON u.id = l.employee_id
       JOIN projects p ON p.id = l.project_id
       WHERE l.id = $1`,
      [req.params.id]
    )
    const row = result.rows[0]
    if (!row) return res.status(404).json({ error: 'Not found' })
    return res.json({ entry: toLabourEntryWithRelations(row) })
  } catch (err) {
    return next(err)
  }
})

// Validate and extract a CreateLabourInput from arbitrary body.
// Returns either a parsed object or an error message.
function parseCreateLabour(body: unknown): { ok: true; value: {
  date: string
  employeeId: string
  projectId: string
  hours: number
  labourTime: LabourTime
  labourType: LabourType
  objectiveEvidence: ObjectiveEvidence
  notes: string | null
} } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be an object' }
  const b = body as Record<string, unknown>

  if (!isIsoDate(b.date)) return { ok: false, error: 'Invalid `date` (expected YYYY-MM-DD)' }
  if (!isUuid(b.employeeId)) return { ok: false, error: 'Invalid `employeeId`' }
  if (!isUuid(b.projectId)) return { ok: false, error: 'Invalid `projectId`' }
  if (!isValidHours(b.hours)) return { ok: false, error: '`hours` must be a number > 0 and <= 24' }
  if (typeof b.labourTime !== 'string' || !LABOUR_TIMES.has(b.labourTime as LabourTime)) {
    return { ok: false, error: 'Invalid `labourTime`' }
  }
  if (typeof b.labourType !== 'string' || !LABOUR_TYPES.has(b.labourType as LabourType)) {
    return { ok: false, error: 'Invalid `labourType`' }
  }
  if (typeof b.objectiveEvidence !== 'string' || !OBJECTIVE_EVIDENCE_VALUES.has(b.objectiveEvidence as ObjectiveEvidence)) {
    return { ok: false, error: 'Invalid `objectiveEvidence`' }
  }
  const notes = b.notes === undefined || b.notes === null
    ? null
    : typeof b.notes === 'string'
      ? b.notes
      : null

  return {
    ok: true,
    value: {
      date: b.date,
      employeeId: b.employeeId,
      projectId: b.projectId,
      hours: b.hours,
      labourTime: b.labourTime as LabourTime,
      labourType: b.labourType as LabourType,
      objectiveEvidence: b.objectiveEvidence as ObjectiveEvidence,
      notes,
    },
  }
}

// Verify the (employeeId, projectId) pair actually references existing rows.
// Cheap one-trip check; FK violation would also catch it but error shape is worse.
async function verifyForeignKeys(employeeId: string, projectId: string): Promise<string | null> {
  const res = await query<{ employee_exists: boolean; project_exists: boolean }>(
    `SELECT
       EXISTS(SELECT 1 FROM users    WHERE id = $1) AS employee_exists,
       EXISTS(SELECT 1 FROM projects WHERE id = $2) AS project_exists`,
    [employeeId, projectId]
  )
  const row = res.rows[0]
  if (!row?.employee_exists) return 'employeeId does not exist'
  if (!row?.project_exists) return 'projectId does not exist'
  return null
}

router.post('/', async (req, res, next) => {
  try {
    const parsed = parseCreateLabour(req.body)
    if (!parsed.ok) return res.status(400).json({ error: parsed.error })
    const v = parsed.value

    const fkErr = await verifyForeignKeys(v.employeeId, v.projectId)
    if (fkErr) return res.status(400).json({ error: fkErr })

    const result = await query<LabourRow>(
      `INSERT INTO labour_entries
        (date, employee_id, project_id, hours, labour_time, labour_type, objective_evidence, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${LABOUR_SELECT.replace(/l\./g, '')}`,
      [v.date, v.employeeId, v.projectId, v.hours, v.labourTime, v.labourType, v.objectiveEvidence, v.notes]
    )
    return res.status(201).json({ entry: toLabourEntry(result.rows[0]) })
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
    const b = req.body as Record<string, unknown>

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
    if ('hours' in b) {
      if (!isValidHours(b.hours)) return res.status(400).json({ error: '`hours` must be a number > 0 and <= 24' })
      push('hours', b.hours)
    }
    if ('labourTime' in b) {
      if (typeof b.labourTime !== 'string' || !LABOUR_TIMES.has(b.labourTime as LabourTime)) {
        return res.status(400).json({ error: 'Invalid `labourTime`' })
      }
      push('labour_time', b.labourTime)
    }
    if ('labourType' in b) {
      if (typeof b.labourType !== 'string' || !LABOUR_TYPES.has(b.labourType as LabourType)) {
        return res.status(400).json({ error: 'Invalid `labourType`' })
      }
      push('labour_type', b.labourType)
    }
    if ('objectiveEvidence' in b) {
      if (typeof b.objectiveEvidence !== 'string' || !OBJECTIVE_EVIDENCE_VALUES.has(b.objectiveEvidence as ObjectiveEvidence)) {
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

    // If FK columns changed, verify the new references exist.
    if ('employeeId' in b || 'projectId' in b) {
      // Look up the current row to fill in whichever FK wasn't updated.
      const current = await query<{ employee_id: string; project_id: string }>(
        `SELECT employee_id, project_id FROM labour_entries WHERE id = $1`,
        [req.params.id]
      )
      const row = current.rows[0]
      if (!row) return res.status(404).json({ error: 'Not found' })
      const fkErr = await verifyForeignKeys(
        (b.employeeId as string | undefined) ?? row.employee_id,
        (b.projectId as string | undefined) ?? row.project_id
      )
      if (fkErr) return res.status(400).json({ error: fkErr })
    }

    sets.push(`updated_at = now()`)
    params.push(req.params.id)
    const result = await query<LabourRow>(
      `UPDATE labour_entries
       SET ${sets.join(', ')}
       WHERE id = $${params.length}
       RETURNING ${LABOUR_SELECT.replace(/l\./g, '')}`,
      params
    )
    const row = result.rows[0]
    if (!row) return res.status(404).json({ error: 'Not found' })
    return res.json({ entry: toLabourEntry(row) })
  } catch (err) {
    return next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })
    const result = await query(`DELETE FROM labour_entries WHERE id = $1`, [req.params.id])
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' })
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

export default router
