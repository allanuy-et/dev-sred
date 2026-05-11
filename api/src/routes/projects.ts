import { Router } from 'express'
import type {
  CreateProjectInput,
  Project,
  ProjectPhase,
  ProjectStatus,
  ProjectType,
  UpdateProjectInput,
} from '@sred/shared'
import { query } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()
router.use(requireAuth)

// --- Validation helpers (hand-written; no external library) ---

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const PROJECT_TYPES = new Set<ProjectType>(['sred', 'internal'])
const PROJECT_PHASES = new Set<ProjectPhase>(['concept', 'development', 'complete'])
const STATUS_FILTERS = new Set(['active', 'inactive', 'all'])

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !ISO_DATE_RE.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime())
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

// Escape ILIKE wildcards so user input can't act as wildcards.
function escapeIlikeWildcards(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

// --- Row shape + mapper ---

interface ProjectRow {
  id: string
  company_id: string
  name: string
  description: string | null
  type: ProjectType
  is_global: boolean
  parent_project_id: string | null
  status: ProjectStatus
  phase: ProjectPhase
  start_date: Date | string | null
  due_date: Date | string | null
  project_manager_id: string | null
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

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description,
    type: row.type,
    isGlobal: row.is_global,
    parentProjectId: row.parent_project_id,
    status: row.status,
    phase: row.phase,
    startDate: toIsoDate(row.start_date),
    dueDate: toIsoDate(row.due_date),
    projectManagerId: row.project_manager_id,
    createdAt: toIsoTs(row.created_at),
    updatedAt: toIsoTs(row.updated_at),
  }
}

const PROJECT_SELECT = `
  p.id, p.company_id, p.name, p.description, p.type, p.is_global, p.parent_project_id,
  p.status, p.phase, p.start_date, p.due_date, p.project_manager_id,
  p.created_at, p.updated_at`

// RETURNING runs against the target table directly and rejects aliases, so
// drop the `p.` prefix from the SELECT list.
const PROJECT_RETURNING = PROJECT_SELECT.replace(/p\./g, '')

// Confirm a referenced (parent project / manager) row belongs to caller's company.
// Returns true if no row exists, OR row exists in another company — both should 400.
async function existsInCompany(
  table: 'projects' | 'users',
  id: string,
  companyId: string
): Promise<boolean> {
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM ${table} WHERE id = $1 AND company_id = $2) AS exists`,
    [id, companyId]
  )
  return Boolean(result.rows[0]?.exists)
}

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
      statusClause = ` AND p.status = $${params.length}`
    }

    // ?q= free-text search: ignore silently if missing / <2 chars after trim.
    let qClause = ''
    if (typeof req.query.q === 'string') {
      const trimmed = req.query.q.trim()
      if (trimmed.length >= 2) {
        params.push(`%${escapeIlikeWildcards(trimmed)}%`)
        const idx = params.length
        qClause = ` AND (p.name ILIKE $${idx} OR COALESCE(p.description, '') ILIKE $${idx})`
      }
    }

    const result = await query<ProjectRow>(
      `SELECT ${PROJECT_SELECT}
       FROM projects p
       JOIN users me ON me.id = $1
       WHERE p.company_id = me.company_id${statusClause}${qClause}
       ORDER BY p.name`,
      params
    )
    return res.json({ projects: result.rows.map(toProject) })
  } catch (err) {
    return next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })

    const result = await query<ProjectRow>(
      `SELECT ${PROJECT_SELECT}
       FROM projects p
       JOIN users me ON me.id = $1
       WHERE p.id = $2 AND p.company_id = me.company_id`,
      [req.user!.userId, req.params.id]
    )
    const row = result.rows[0]
    if (!row) return res.status(404).json({ error: 'Not found' })
    return res.json({ project: toProject(row) })
  } catch (err) {
    return next(err)
  }
})

interface ParsedCreateProject {
  name: string
  type: ProjectType
  description: string | null
  isGlobal: boolean | null
  parentProjectId: string | null
  phase: ProjectPhase | null
  startDate: string | null
  dueDate: string | null
  projectManagerId: string | null
}

function parseCreateProject(
  body: unknown
): { ok: true; value: ParsedCreateProject } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be an object' }
  const b = body as Partial<Record<keyof CreateProjectInput, unknown>>

  if (!isNonEmptyString(b.name)) return { ok: false, error: 'Invalid `name`' }
  if (typeof b.type !== 'string' || !PROJECT_TYPES.has(b.type as ProjectType)) {
    return { ok: false, error: 'Invalid `type`' }
  }

  let description: string | null = null
  if ('description' in b) {
    if (b.description !== null && typeof b.description !== 'string') {
      return { ok: false, error: 'Invalid `description`' }
    }
    description = b.description ?? null
  }

  let isGlobal: boolean | null = null
  if ('isGlobal' in b && b.isGlobal !== undefined) {
    if (typeof b.isGlobal !== 'boolean') return { ok: false, error: '`isGlobal` must be boolean' }
    isGlobal = b.isGlobal
  }

  let parentProjectId: string | null = null
  if ('parentProjectId' in b) {
    if (b.parentProjectId === null) parentProjectId = null
    else if (!isUuid(b.parentProjectId)) return { ok: false, error: 'Invalid `parentProjectId`' }
    else parentProjectId = b.parentProjectId
  }

  let phase: ProjectPhase | null = null
  if ('phase' in b && b.phase !== undefined) {
    if (typeof b.phase !== 'string' || !PROJECT_PHASES.has(b.phase as ProjectPhase)) {
      return { ok: false, error: 'Invalid `phase`' }
    }
    phase = b.phase as ProjectPhase
  }

  let startDate: string | null = null
  if ('startDate' in b) {
    if (b.startDate === null) startDate = null
    else if (!isIsoDate(b.startDate)) return { ok: false, error: 'Invalid `startDate`' }
    else startDate = b.startDate
  }

  let dueDate: string | null = null
  if ('dueDate' in b) {
    if (b.dueDate === null) dueDate = null
    else if (!isIsoDate(b.dueDate)) return { ok: false, error: 'Invalid `dueDate`' }
    else dueDate = b.dueDate
  }

  let projectManagerId: string | null = null
  if ('projectManagerId' in b) {
    if (b.projectManagerId === null) projectManagerId = null
    else if (!isUuid(b.projectManagerId)) return { ok: false, error: 'Invalid `projectManagerId`' }
    else projectManagerId = b.projectManagerId
  }

  return {
    ok: true,
    value: {
      name: b.name,
      type: b.type as ProjectType,
      description,
      isGlobal,
      parentProjectId,
      phase,
      startDate,
      dueDate,
      projectManagerId,
    },
  }
}

router.post('/', async (req, res, next) => {
  try {
    const parsed = parseCreateProject(req.body)
    if (!parsed.ok) return res.status(400).json({ error: parsed.error })
    const v = parsed.value

    const me = await query<{ company_id: string }>(
      `SELECT company_id FROM users WHERE id = $1`,
      [req.user!.userId]
    )
    const companyId = me.rows[0]?.company_id
    if (!companyId) return res.status(401).json({ error: 'Not authenticated' })

    // Verify cross-references stay inside caller's company.
    if (v.parentProjectId && !(await existsInCompany('projects', v.parentProjectId, companyId))) {
      return res.status(400).json({ error: 'Invalid `parentProjectId`' })
    }
    if (v.projectManagerId && !(await existsInCompany('users', v.projectManagerId, companyId))) {
      return res.status(400).json({ error: 'Invalid `projectManagerId`' })
    }

    const cols: string[] = ['company_id', 'name', 'type']
    const vals: unknown[] = [companyId, v.name, v.type]
    // `maybe` skips both null and undefined; nullable columns then fall back
    // to their DB default (NULL). Caller passing `null` and caller omitting
    // the field reach the same end-state, so no outer null guard needed.
    const maybe = (col: string, value: unknown) => {
      if (value === null || value === undefined) return
      cols.push(col)
      vals.push(value)
    }
    maybe('description', v.description)
    maybe('is_global', v.isGlobal)
    maybe('parent_project_id', v.parentProjectId)
    maybe('phase', v.phase)
    maybe('start_date', v.startDate)
    maybe('due_date', v.dueDate)
    maybe('project_manager_id', v.projectManagerId)

    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ')

    const result = await query<ProjectRow>(
      `INSERT INTO projects (${cols.join(', ')})
       VALUES (${placeholders})
       RETURNING ${PROJECT_RETURNING}`,
      vals
    )
    return res.status(201).json({ project: toProject(result.rows[0]) })
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
    const b = req.body as Partial<Record<keyof UpdateProjectInput, unknown>>

    // Need caller's company up front to validate cross-refs.
    const me = await query<{ company_id: string }>(
      `SELECT company_id FROM users WHERE id = $1`,
      [req.user!.userId]
    )
    const companyId = me.rows[0]?.company_id
    if (!companyId) return res.status(401).json({ error: 'Not authenticated' })

    const sets: string[] = []
    const params: unknown[] = []
    const push = (sql: string, value: unknown) => {
      params.push(value)
      sets.push(`${sql} = $${params.length}`)
    }

    if ('name' in b) {
      if (!isNonEmptyString(b.name)) return res.status(400).json({ error: 'Invalid `name`' })
      push('name', b.name)
    }
    if ('type' in b) {
      if (typeof b.type !== 'string' || !PROJECT_TYPES.has(b.type as ProjectType)) {
        return res.status(400).json({ error: 'Invalid `type`' })
      }
      push('type', b.type)
    }
    if ('description' in b) {
      if (b.description !== null && typeof b.description !== 'string') {
        return res.status(400).json({ error: 'Invalid `description`' })
      }
      push('description', b.description ?? null)
    }
    if ('isGlobal' in b) {
      if (typeof b.isGlobal !== 'boolean') return res.status(400).json({ error: '`isGlobal` must be boolean' })
      push('is_global', b.isGlobal)
    }
    if ('parentProjectId' in b) {
      if (b.parentProjectId === null) {
        push('parent_project_id', null)
      } else {
        if (!isUuid(b.parentProjectId)) return res.status(400).json({ error: 'Invalid `parentProjectId`' })
        if (b.parentProjectId === req.params.id) {
          return res.status(400).json({ error: '`parentProjectId` cannot equal the project id' })
        }
        if (!(await existsInCompany('projects', b.parentProjectId, companyId))) {
          return res.status(400).json({ error: 'Invalid `parentProjectId`' })
        }
        push('parent_project_id', b.parentProjectId)
      }
    }
    if ('phase' in b) {
      if (typeof b.phase !== 'string' || !PROJECT_PHASES.has(b.phase as ProjectPhase)) {
        return res.status(400).json({ error: 'Invalid `phase`' })
      }
      push('phase', b.phase)
    }
    if ('startDate' in b) {
      if (b.startDate !== null && !isIsoDate(b.startDate)) {
        return res.status(400).json({ error: 'Invalid `startDate`' })
      }
      push('start_date', b.startDate ?? null)
    }
    if ('dueDate' in b) {
      if (b.dueDate !== null && !isIsoDate(b.dueDate)) {
        return res.status(400).json({ error: 'Invalid `dueDate`' })
      }
      push('due_date', b.dueDate ?? null)
    }
    if ('projectManagerId' in b) {
      if (b.projectManagerId === null) {
        push('project_manager_id', null)
      } else {
        if (!isUuid(b.projectManagerId)) return res.status(400).json({ error: 'Invalid `projectManagerId`' })
        if (!(await existsInCompany('users', b.projectManagerId, companyId))) {
          return res.status(400).json({ error: 'Invalid `projectManagerId`' })
        }
        push('project_manager_id', b.projectManagerId)
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' })
    }

    sets.push(`updated_at = now()`)
    params.push(req.params.id)
    const idIdx = params.length
    params.push(companyId)
    const companyIdx = params.length

    const result = await query<ProjectRow>(
      `UPDATE projects p
       SET ${sets.join(', ')}
       WHERE p.id = $${idIdx} AND p.company_id = $${companyIdx}
       RETURNING ${PROJECT_RETURNING}`,
      params
    )
    const row = result.rows[0]
    if (!row) return res.status(404).json({ error: 'Not found' })
    return res.json({ project: toProject(row) })
  } catch (err) {
    return next(err)
  }
})

async function setProjectStatus(
  projectId: string,
  callerId: string,
  status: 'active' | 'inactive'
): Promise<boolean> {
  const result = await query(
    `UPDATE projects p
     SET status = $1, updated_at = now()
     FROM users me
     WHERE p.id = $2 AND me.id = $3 AND p.company_id = me.company_id`,
    [status, projectId, callerId]
  )
  return (result.rowCount ?? 0) > 0
}

router.post('/:id/deactivate', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })
    const ok = await setProjectStatus(req.params.id, req.user!.userId, 'inactive')
    if (!ok) return res.status(404).json({ error: 'Not found' })
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

router.post('/:id/reactivate', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' })
    const ok = await setProjectStatus(req.params.id, req.user!.userId, 'active')
    if (!ok) return res.status(404).json({ error: 'Not found' })
    return res.json({ ok: true })
  } catch (err) {
    return next(err)
  }
})

export default router
