import { Router } from 'express'
import type { SearchMatch, SearchResponse } from '@sred/shared'
import { query } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()
router.use(requireAuth)

// ILIKE pattern characters that need escaping so user input can't act as wildcards.
function escapeLike(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

interface ProjectMatchRow {
  id: string
  name: string
  phase: string
  type: string
}

interface EmployeeMatchRow {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string | null
}

router.get('/', async (req, res, next) => {
  try {
    const q = req.query.q
    if (typeof q !== 'string') {
      return res.status(400).json({ error: '`q` is required' })
    }

    const limitRaw = Number(req.query.limit ?? 10)
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 50 ? Math.floor(limitRaw) : 10

    const trimmed = q.trim()
    // Short queries skip the DB entirely — keeps autocomplete cheap.
    if (trimmed.length < 2) {
      const empty: SearchResponse = { projects: [], employees: [] }
      return res.json(empty)
    }

    const pattern = `%${escapeLike(trimmed)}%`
    const userId = req.user!.userId

    // Two small queries in parallel — each company-scoped via the caller's company_id.
    const [projectRes, employeeRes] = await Promise.all([
      query<ProjectMatchRow>(
        `SELECT p.id, p.name, p.phase, p.type
         FROM projects p
         JOIN users me ON me.id = $1
         WHERE p.company_id = me.company_id
           AND p.status = 'active'
           AND p.name ILIKE $2
         ORDER BY p.name
         LIMIT $3`,
        [userId, pattern, limit]
      ),
      query<EmployeeMatchRow>(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.role
         FROM users u
         JOIN users me ON me.id = $1
         WHERE u.company_id = me.company_id
           AND u.status = 'active'
           AND (u.first_name || ' ' || u.last_name || ' ' || u.email) ILIKE $2
         ORDER BY u.last_name, u.first_name
         LIMIT $3`,
        [userId, pattern, limit]
      ),
    ])

    const projects: SearchMatch[] = projectRes.rows.map((r) => ({
      id: r.id,
      label: r.name,
      kind: 'project',
      detail: `${r.phase} · ${r.type}`,
    }))

    const employees: SearchMatch[] = employeeRes.rows.map((r) => ({
      id: r.id,
      label: `${r.first_name} ${r.last_name}`.trim(),
      kind: 'employee',
      detail: r.role ?? r.email,
    }))

    const body: SearchResponse = { projects, employees }
    return res.json(body)
  } catch (err) {
    return next(err)
  }
})

export default router
