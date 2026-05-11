import { Router } from 'express'
import type { Project, ProjectPhase, ProjectStatus, ProjectType } from '@sred/shared'
import { query } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()
router.use(requireAuth)

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

router.get('/', async (req, res, next) => {
  try {
    const result = await query<ProjectRow>(
      `SELECT p.id, p.company_id, p.name, p.description, p.type, p.is_global, p.parent_project_id,
              p.status, p.phase, p.start_date, p.due_date, p.project_manager_id,
              p.created_at, p.updated_at
       FROM projects p
       JOIN users me ON me.id = $1
       WHERE p.company_id = me.company_id AND p.status = 'active'
       ORDER BY p.name`,
      [req.user!.userId]
    )
    return res.json({ projects: result.rows.map(toProject) })
  } catch (err) {
    return next(err)
  }
})

export default router
