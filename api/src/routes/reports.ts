import { Router } from 'express'
import type {
  MonthlyReportResponse,
  ProjectType,
  ReportMonthRow,
  ReportProjectRow,
  ReportTotals,
  YearlyReportResponse,
} from '@sred/shared'
import { query } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()
router.use(requireAuth)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Typed via `ProjectType | 'all'` so TS catches the literal list if ProjectType
// ever gains a new value (and we then have to decide what `?type=` means for it).
type TypeFilter = ProjectType | 'all'
const TYPE_FILTERS = new Set<TypeFilter>(['all', 'sred', 'internal'])

// Toronto-local boundaries. labour/expense `date` columns are DATE (no tz),
// so user-supplied year/month maps directly to date bounds via make_date —
// no tz conversion needed for tz-naive data. The America/Toronto interpretation
// is implicit in how we treat those dates (same convention as dashboard.ts).

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

function parseInt1to12(v: unknown): number | null {
  if (typeof v !== 'string') return null
  const n = Number(v)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 12) return null
  return n
}

function parseYear(v: unknown): number | null {
  if (typeof v !== 'string') return null
  const n = Number(v)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1900 || n > 9999) return null
  return n
}

interface MonthlyAggRow {
  project_id: string
  project_name: string
  project_type: ProjectType
  hours: string | null
  cost: string | null
  sred_hours: string | null
  sred_cost: string | null
}

interface YearlyAggRow {
  month: string // EXTRACT returns NUMERIC -> string
  hours: string | null
  cost: string | null
  sred_hours: string | null
  sred_cost: string | null
}

function n(v: string | null | undefined): number {
  return v == null ? 0 : Number(v)
}

router.get('/monthly', async (req, res, next) => {
  try {
    const year = parseYear(req.query.year)
    const month = parseInt1to12(req.query.month)
    if (year == null) return res.status(400).json({ error: 'Invalid `year`' })
    if (month == null) return res.status(400).json({ error: 'Invalid `month`' })

    const typeRaw = typeof req.query.type === 'string' ? req.query.type : 'all'
    if (!TYPE_FILTERS.has(typeRaw as 'all' | 'sred' | 'internal')) {
      return res.status(400).json({ error: 'Invalid `type` (expected all|sred|internal)' })
    }

    let projectId: string | null = null
    if (typeof req.query.projectId === 'string' && req.query.projectId.length > 0) {
      if (!isUuid(req.query.projectId)) return res.status(400).json({ error: 'Invalid `projectId`' })
      projectId = req.query.projectId
    }

    // Build WHERE for project-type filter applied to the SELECT (post-join with projects).
    const params: unknown[] = [req.user!.userId, year, month]
    let typeClause = ''
    if (typeRaw !== 'all') {
      params.push(typeRaw)
      typeClause = ` AND p.type = $${params.length}`
    }
    let projectClause = ''
    if (projectId) {
      params.push(projectId)
      projectClause = ` AND p.id = $${params.length}`
    }

    // Single round-trip: UNION labour+expense rows in the period, then aggregate
    // per project with FILTER (WHERE p.type='sred') for the SR&ED-only subtotals.
    const result = await query<MonthlyAggRow>(
      `WITH bounds AS (
         SELECT make_date($2::int, $3::int, 1) AS month_start,
                (make_date($2::int, $3::int, 1) + interval '1 month' - interval '1 day')::date AS month_end
       ),
       activity AS (
         SELECT l.project_id, l.hours::numeric AS hours, 0::numeric AS cost
         FROM labour_entries l, bounds b
         WHERE l.date BETWEEN b.month_start AND b.month_end
         UNION ALL
         SELECT e.project_id, 0::numeric AS hours, e.cost::numeric AS cost
         FROM expenses e, bounds b
         WHERE e.date BETWEEN b.month_start AND b.month_end
       )
       SELECT
         p.id           AS project_id,
         p.name         AS project_name,
         p.type         AS project_type,
         COALESCE(SUM(a.hours), 0)::text                                    AS hours,
         COALESCE(SUM(a.cost), 0)::text                                     AS cost,
         COALESCE(SUM(a.hours) FILTER (WHERE p.type = 'sred'), 0)::text     AS sred_hours,
         COALESCE(SUM(a.cost)  FILTER (WHERE p.type = 'sred'), 0)::text     AS sred_cost
       FROM activity a
       JOIN projects p ON p.id = a.project_id
       JOIN users me   ON me.id = $1
       WHERE p.company_id = me.company_id${typeClause}${projectClause}
       GROUP BY p.id, p.name, p.type
       ORDER BY p.name`,
      params
    )

    const rows: ReportProjectRow[] = result.rows.map((r) => ({
      projectId: r.project_id,
      projectName: r.project_name,
      projectType: r.project_type,
      hours: n(r.hours),
      cost: n(r.cost),
      sredHours: n(r.sred_hours),
      sredCost: n(r.sred_cost),
    }))

    const totals: ReportTotals = rows.reduce<ReportTotals>(
      (acc, r) => ({
        hours: acc.hours + r.hours,
        cost: acc.cost + r.cost,
        sredHours: acc.sredHours + r.sredHours,
        sredCost: acc.sredCost + r.sredCost,
      }),
      { hours: 0, cost: 0, sredHours: 0, sredCost: 0 }
    )

    const body: MonthlyReportResponse = { rows, totals }
    return res.json(body)
  } catch (err) {
    return next(err)
  }
})

router.get('/yearly', async (req, res, next) => {
  try {
    const year = parseYear(req.query.year)
    if (year == null) return res.status(400).json({ error: 'Invalid `year`' })

    const typeRaw = typeof req.query.type === 'string' ? req.query.type : 'all'
    if (!TYPE_FILTERS.has(typeRaw as 'all' | 'sred' | 'internal')) {
      return res.status(400).json({ error: 'Invalid `type` (expected all|sred|internal)' })
    }

    let projectId: string | null = null
    if (typeof req.query.projectId === 'string' && req.query.projectId.length > 0) {
      if (!isUuid(req.query.projectId)) return res.status(400).json({ error: 'Invalid `projectId`' })
      projectId = req.query.projectId
    }

    const params: unknown[] = [req.user!.userId, year]
    let typeClause = ''
    if (typeRaw !== 'all') {
      params.push(typeRaw)
      typeClause = ` AND p.type = $${params.length}`
    }
    let projectClause = ''
    if (projectId) {
      params.push(projectId)
      projectClause = ` AND p.id = $${params.length}`
    }

    // Per-month aggregation over the full year. We bucket by EXTRACT(MONTH FROM date)
    // against the tz-naive DATE column and LEFT JOIN onto generate_series(1,12) so
    // months with no activity always emit a zero row.
    const result = await query<YearlyAggRow>(
      `WITH bounds AS (
         SELECT make_date($2::int, 1, 1)                                   AS year_start,
                (make_date($2::int, 1, 1) + interval '1 year' - interval '1 day')::date AS year_end
       ),
       activity AS (
         SELECT l.project_id, l.date, l.hours::numeric AS hours, 0::numeric AS cost
         FROM labour_entries l, bounds b
         WHERE l.date BETWEEN b.year_start AND b.year_end
         UNION ALL
         SELECT e.project_id, e.date, 0::numeric AS hours, e.cost::numeric AS cost
         FROM expenses e, bounds b
         WHERE e.date BETWEEN b.year_start AND b.year_end
       ),
       filtered AS (
         SELECT EXTRACT(MONTH FROM a.date)::int AS month,
                a.hours,
                a.cost,
                p.type AS project_type
         FROM activity a
         JOIN projects p ON p.id = a.project_id
         JOIN users me   ON me.id = $1
         WHERE p.company_id = me.company_id${typeClause}${projectClause}
       )
       SELECT m::text AS month,
              COALESCE(SUM(f.hours), 0)::text                                          AS hours,
              COALESCE(SUM(f.cost), 0)::text                                           AS cost,
              COALESCE(SUM(f.hours) FILTER (WHERE f.project_type = 'sred'), 0)::text   AS sred_hours,
              COALESCE(SUM(f.cost)  FILTER (WHERE f.project_type = 'sred'), 0)::text   AS sred_cost
       FROM generate_series(1, 12) AS m
       LEFT JOIN filtered f ON f.month = m
       GROUP BY m
       ORDER BY m`,
      params
    )

    const rows: ReportMonthRow[] = result.rows.map((r) => ({
      month: Number(r.month),
      hours: n(r.hours),
      cost: n(r.cost),
      sredHours: n(r.sred_hours),
      sredCost: n(r.sred_cost),
    }))

    const totals: ReportTotals = rows.reduce<ReportTotals>(
      (acc, r) => ({
        hours: acc.hours + r.hours,
        cost: acc.cost + r.cost,
        sredHours: acc.sredHours + r.sredHours,
        sredCost: acc.sredCost + r.sredCost,
      }),
      { hours: 0, cost: 0, sredHours: 0, sredCost: 0 }
    )

    const body: YearlyReportResponse = { rows, totals }
    return res.json(body)
  } catch (err) {
    return next(err)
  }
})

export default router
