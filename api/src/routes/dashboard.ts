import { Router } from 'express'
import type { DashboardStats, RecentActivityItem } from '@sred/shared'
import { query } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

router.use(requireAuth)

// Toronto-local current week for now. When user.timezone wiring lands, swap in
// the per-user timezone instead of this constant.
const APP_TZ = 'America/Toronto'

router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user!.userId

    // hoursThisWeek: sum of this user's labour entry hours from Monday 00:00 to
    // Sunday 23:59 (Toronto local). labour_entries.date is a DATE so we compare
    // against the Toronto-local week boundaries derived from now().
    const hoursRes = await query<{ total: string | null }>(
      `WITH bounds AS (
         SELECT
           date_trunc('week', (now() AT TIME ZONE $2))::date          AS week_start,
           (date_trunc('week', (now() AT TIME ZONE $2)) + interval '6 days')::date AS week_end
       )
       SELECT COALESCE(SUM(l.hours), 0)::text AS total
       FROM labour_entries l, bounds b
       WHERE l.employee_id = $1
         AND l.date BETWEEN b.week_start AND b.week_end`,
      [userId, APP_TZ]
    )
    const hoursThisWeek = Number(hoursRes.rows[0]?.total ?? 0)

    // Company-scoped project counts. We pull company_id off the logged-in user.
    const projRes = await query<{
      total: string
      sred: string
    }>(
      `SELECT
         COUNT(*)::text                                   AS total,
         COUNT(*) FILTER (WHERE p.type = 'sred')::text    AS sred
       FROM projects p
       JOIN users u ON u.id = $1
       WHERE p.company_id = u.company_id`,
      [userId]
    )
    const projectsCount = Number(projRes.rows[0]?.total ?? 0)
    const projectsInSred = Number(projRes.rows[0]?.sred ?? 0)

    const body: DashboardStats = { hoursThisWeek, projectsCount, projectsInSred }
    return res.json(body)
  } catch (err) {
    return next(err)
  }
})

interface LabourActivityRow {
  id: string
  ts: Date | string
  hours: string
  first_name: string
  last_name: string
  project_name: string
}

interface ProjectActivityRow {
  id: string
  ts: Date | string
  name: string
}

function toIso(v: Date | string): string {
  return typeof v === 'string' ? new Date(v).toISOString() : v.toISOString()
}

router.get('/recent-activity', async (req, res, next) => {
  try {
    const userId = req.user!.userId

    // Both queries scoped to the logged-in user's company.
    const [labourRes, projectRes] = await Promise.all([
      query<LabourActivityRow>(
        `SELECT l.id,
                l.created_at AS ts,
                l.hours::text AS hours,
                u.first_name,
                u.last_name,
                p.name AS project_name
         FROM labour_entries l
         JOIN users u    ON u.id = l.employee_id
         JOIN projects p ON p.id = l.project_id
         JOIN users me   ON me.id = $1
         WHERE u.company_id = me.company_id
           AND l.created_at >= now() - interval '7 days'
         ORDER BY l.created_at DESC
         LIMIT 10`,
        [userId]
      ),
      query<ProjectActivityRow>(
        `SELECT p.id,
                p.created_at AS ts,
                p.name
         FROM projects p
         JOIN users me ON me.id = $1
         WHERE p.company_id = me.company_id
           AND p.created_at >= now() - interval '30 days'
         ORDER BY p.created_at DESC
         LIMIT 10`,
        [userId]
      ),
    ])

    const labourItems: RecentActivityItem[] = labourRes.rows.map((r) => {
      const hours = Number(r.hours).toFixed(2)
      const name = `${r.first_name} ${r.last_name}`.trim()
      return {
        kind: 'labour',
        id: r.id,
        label: `${name} recorded ${hours} hours for ${r.project_name}`,
        ts: toIso(r.ts),
      }
    })

    const projectItems: RecentActivityItem[] = projectRes.rows.map((r) => ({
      kind: 'project',
      id: r.id,
      label: `Project created: ${r.name}`,
      ts: toIso(r.ts),
    }))

    const activity = [...labourItems, ...projectItems]
      .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))
      .slice(0, 10)

    return res.json({ activity })
  } catch (err) {
    return next(err)
  }
})

export default router
