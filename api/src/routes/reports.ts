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
  labour_cost: string | null
  sred_hours: string | null
  sred_cost: string | null
  sred_labour_cost: string | null
}

interface YearlyAggRow {
  month: string // EXTRACT returns NUMERIC -> string
  hours: string | null
  cost: string | null
  labour_cost: string | null
  sred_hours: string | null
  sred_cost: string | null
  sred_labour_cost: string | null
}

function n(v: string | null | undefined): number {
  return v == null ? 0 : Number(v)
}

// Shared SQL fragment: each labour row gets the rate that was in effect on
// its date via a LATERAL join into wage_history (newest row with
// effective_date <= l.date). The rate picked from the three columns depends
// on the entry's `labour_time`.
const LABOUR_PRICED_SQL = `
  SELECT
    l.project_id,
    l.date,
    l.hours::numeric AS hours,
    (l.hours::numeric * COALESCE(
       CASE l.labour_time
         WHEN 'overtime' THEN wh.overtime_rate
         WHEN 'double'   THEN wh.holiday_rate
         ELSE                 wh.regular_rate
       END, 0))::numeric AS labour_cost
  FROM labour_entries l
  LEFT JOIN LATERAL (
    SELECT regular_rate, overtime_rate, holiday_rate
    FROM wage_history wh
    WHERE wh.employee_id = l.employee_id
      AND wh.effective_date <= l.date
    ORDER BY wh.effective_date DESC
    LIMIT 1
  ) wh ON TRUE
`

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
       labour_priced AS (
         ${LABOUR_PRICED_SQL}
         , bounds b
         WHERE l.date BETWEEN b.month_start AND b.month_end
       ),
       activity AS (
         SELECT lp.project_id,
                lp.hours,
                0::numeric AS cost,
                lp.labour_cost
         FROM labour_priced lp
         UNION ALL
         SELECT e.project_id,
                0::numeric AS hours,
                e.cost::numeric AS cost,
                0::numeric AS labour_cost
         FROM expenses e, bounds b
         WHERE e.date BETWEEN b.month_start AND b.month_end
       )
       SELECT
         p.id           AS project_id,
         p.name         AS project_name,
         p.type         AS project_type,
         COALESCE(SUM(a.hours), 0)::text                                          AS hours,
         COALESCE(SUM(a.cost), 0)::text                                           AS cost,
         COALESCE(SUM(a.labour_cost), 0)::text                                    AS labour_cost,
         COALESCE(SUM(a.hours)       FILTER (WHERE p.type = 'sred'), 0)::text     AS sred_hours,
         COALESCE(SUM(a.cost)        FILTER (WHERE p.type = 'sred'), 0)::text     AS sred_cost,
         COALESCE(SUM(a.labour_cost) FILTER (WHERE p.type = 'sred'), 0)::text     AS sred_labour_cost
       FROM activity a
       JOIN projects p ON p.id = a.project_id
       JOIN users me   ON me.id = $1
       WHERE p.company_id = me.company_id${typeClause}${projectClause}
       GROUP BY p.id, p.name, p.type
       ORDER BY p.name`,
      params
    )

    const rows: ReportProjectRow[] = result.rows.map((r) => {
      const hours = n(r.hours)
      const cost = n(r.cost)
      const labourCost = n(r.labour_cost)
      const sredHours = n(r.sred_hours)
      const sredCost = n(r.sred_cost)
      const sredLabourCost = n(r.sred_labour_cost)
      return {
        projectId: r.project_id,
        projectName: r.project_name,
        projectType: r.project_type,
        hours,
        cost,
        labourCost,
        totalCost: cost + labourCost,
        sredHours,
        sredCost,
        sredLabourCost,
        sredTotalCost: sredCost + sredLabourCost,
      }
    })

    const totals: ReportTotals = rows.reduce<ReportTotals>(
      (acc, r) => ({
        hours: acc.hours + r.hours,
        cost: acc.cost + r.cost,
        labourCost: acc.labourCost + r.labourCost,
        totalCost: acc.totalCost + r.totalCost,
        sredHours: acc.sredHours + r.sredHours,
        sredCost: acc.sredCost + r.sredCost,
        sredLabourCost: acc.sredLabourCost + r.sredLabourCost,
        sredTotalCost: acc.sredTotalCost + r.sredTotalCost,
      }),
      {
        hours: 0,
        cost: 0,
        labourCost: 0,
        totalCost: 0,
        sredHours: 0,
        sredCost: 0,
        sredLabourCost: 0,
        sredTotalCost: 0,
      }
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
       labour_priced AS (
         ${LABOUR_PRICED_SQL}
         , bounds b
         WHERE l.date BETWEEN b.year_start AND b.year_end
       ),
       activity AS (
         SELECT lp.project_id,
                lp.date,
                lp.hours,
                0::numeric AS cost,
                lp.labour_cost
         FROM labour_priced lp
         UNION ALL
         SELECT e.project_id,
                e.date,
                0::numeric AS hours,
                e.cost::numeric AS cost,
                0::numeric AS labour_cost
         FROM expenses e, bounds b
         WHERE e.date BETWEEN b.year_start AND b.year_end
       ),
       filtered AS (
         SELECT EXTRACT(MONTH FROM a.date)::int AS month,
                a.hours,
                a.cost,
                a.labour_cost,
                p.type AS project_type
         FROM activity a
         JOIN projects p ON p.id = a.project_id
         JOIN users me   ON me.id = $1
         WHERE p.company_id = me.company_id${typeClause}${projectClause}
       )
       SELECT m::text AS month,
              COALESCE(SUM(f.hours), 0)::text                                                AS hours,
              COALESCE(SUM(f.cost), 0)::text                                                 AS cost,
              COALESCE(SUM(f.labour_cost), 0)::text                                          AS labour_cost,
              COALESCE(SUM(f.hours)       FILTER (WHERE f.project_type = 'sred'), 0)::text   AS sred_hours,
              COALESCE(SUM(f.cost)        FILTER (WHERE f.project_type = 'sred'), 0)::text   AS sred_cost,
              COALESCE(SUM(f.labour_cost) FILTER (WHERE f.project_type = 'sred'), 0)::text   AS sred_labour_cost
       FROM generate_series(1, 12) AS m
       LEFT JOIN filtered f ON f.month = m
       GROUP BY m
       ORDER BY m`,
      params
    )

    const rows: ReportMonthRow[] = result.rows.map((r) => {
      const hours = n(r.hours)
      const cost = n(r.cost)
      const labourCost = n(r.labour_cost)
      const sredHours = n(r.sred_hours)
      const sredCost = n(r.sred_cost)
      const sredLabourCost = n(r.sred_labour_cost)
      return {
        month: Number(r.month),
        hours,
        cost,
        labourCost,
        totalCost: cost + labourCost,
        sredHours,
        sredCost,
        sredLabourCost,
        sredTotalCost: sredCost + sredLabourCost,
      }
    })

    const totals: ReportTotals = rows.reduce<ReportTotals>(
      (acc, r) => ({
        hours: acc.hours + r.hours,
        cost: acc.cost + r.cost,
        labourCost: acc.labourCost + r.labourCost,
        totalCost: acc.totalCost + r.totalCost,
        sredHours: acc.sredHours + r.sredHours,
        sredCost: acc.sredCost + r.sredCost,
        sredLabourCost: acc.sredLabourCost + r.sredLabourCost,
        sredTotalCost: acc.sredTotalCost + r.sredTotalCost,
      }),
      {
        hours: 0,
        cost: 0,
        labourCost: 0,
        totalCost: 0,
        sredHours: 0,
        sredCost: 0,
        sredLabourCost: 0,
        sredTotalCost: 0,
      }
    )

    const body: YearlyReportResponse = { rows, totals }
    return res.json(body)
  } catch (err) {
    return next(err)
  }
})

export default router
