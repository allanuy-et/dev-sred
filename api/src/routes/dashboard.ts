import { Router } from 'express'
import type {
  DailyHoursBucket,
  DashboardStats,
  ProjectPulseRow,
  RecentActivityItem,
  WeekSummary,
} from '@sred/shared'
import { query } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

router.use(requireAuth)

router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user!.userId

    // hoursThisWeek: sum of this user's labour entry hours from Monday 00:00 to
    // Sunday 23:59 in the caller's timezone. labour_entries.date is a DATE, so
    // we compare against the per-user-tz week boundaries derived from now().
    // The user's tz comes from `users.timezone` (set on the preferences page).
    const hoursRes = await query<{ total: string | null }>(
      `WITH me AS (SELECT timezone FROM users WHERE id = $1),
            bounds AS (
              SELECT
                date_trunc('week', (now() AT TIME ZONE (SELECT timezone FROM me)))::date                                  AS week_start,
                (date_trunc('week', (now() AT TIME ZONE (SELECT timezone FROM me))) + interval '6 days')::date            AS week_end
            )
       SELECT COALESCE(SUM(l.hours), 0)::text AS total
       FROM labour_entries l, bounds b
       WHERE l.employee_id = $1
         AND l.date BETWEEN b.week_start AND b.week_end`,
      [userId]
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

// ----------------------------------------------------------------------------
// /week-summary — drives the redesigned dashboard
//
// Company-scoped. Returns a 7-day Mon→Sun roll-up of labour hours (split by
// SR&ED vs internal), the top 5 projects this week, and the delta vs the
// previous week's total. Week boundaries are computed in the caller's tz so
// "this week" matches the rest of the app.
// ----------------------------------------------------------------------------

interface MeBoundsRow {
  company_id: string
  week_start: string
  week_end: string
  prev_week_start: string
  prev_week_end: string
}

interface DailyRow {
  date: string
  hours: string
  sred_hours: string
}

interface ProjectRow {
  project_id: string
  project_name: string
  project_type: 'sred' | 'internal'
  hours: string
}

router.get('/week-summary', async (req, res, next) => {
  try {
    const userId = req.user!.userId

    // Resolve company + week boundaries in one trip.
    const meRes = await query<MeBoundsRow>(
      `SELECT
         u.company_id,
         to_char(date_trunc('week', (now() AT TIME ZONE u.timezone))::date, 'YYYY-MM-DD')                                    AS week_start,
         to_char((date_trunc('week', (now() AT TIME ZONE u.timezone)) + interval '6 days')::date, 'YYYY-MM-DD')              AS week_end,
         to_char((date_trunc('week', (now() AT TIME ZONE u.timezone)) - interval '7 days')::date, 'YYYY-MM-DD')              AS prev_week_start,
         to_char((date_trunc('week', (now() AT TIME ZONE u.timezone)) - interval '1 day')::date, 'YYYY-MM-DD')               AS prev_week_end
       FROM users u
       WHERE u.id = $1`,
      [userId]
    )
    const me = meRes.rows[0]
    if (!me) return res.status(401).json({ error: 'Not authenticated' })

    const [dailyRes, byProjectRes, prevRes] = await Promise.all([
      // Daily buckets, zero-filled via generate_series.
      // The subquery scopes labour rows to the caller's company before the join,
      // so days with no in-company activity stay at zero.
      query<DailyRow>(
        `SELECT
           to_char(gs.day::date, 'YYYY-MM-DD')                                AS date,
           COALESCE(SUM(le.hours), 0)::text                                   AS hours,
           COALESCE(SUM(le.hours) FILTER (WHERE le.project_type = 'sred'), 0)::text AS sred_hours
         FROM generate_series($2::date, $3::date, interval '1 day') AS gs(day)
         LEFT JOIN (
           SELECT l.date, l.hours, p.type AS project_type
           FROM labour_entries l
           JOIN projects p ON p.id = l.project_id
           WHERE p.company_id = $1
             AND l.date BETWEEN $2::date AND $3::date
         ) le ON le.date = gs.day::date
         GROUP BY gs.day
         ORDER BY gs.day`,
        [me.company_id, me.week_start, me.week_end]
      ),
      // Top 5 projects by hours this week (company-scoped).
      query<ProjectRow>(
        `SELECT
           p.id                                AS project_id,
           p.name                              AS project_name,
           p.type                              AS project_type,
           COALESCE(SUM(l.hours), 0)::text     AS hours
         FROM projects p
         JOIN labour_entries l ON l.project_id = p.id
         WHERE p.company_id = $1
           AND l.date BETWEEN $2::date AND $3::date
         GROUP BY p.id, p.name, p.type
         ORDER BY SUM(l.hours) DESC
         LIMIT 5`,
        [me.company_id, me.week_start, me.week_end]
      ),
      // Previous week total (for delta).
      query<{ total: string }>(
        `SELECT COALESCE(SUM(l.hours), 0)::text AS total
         FROM labour_entries l
         JOIN projects p ON p.id = l.project_id
         WHERE p.company_id = $1
           AND l.date BETWEEN $2::date AND $3::date`,
        [me.company_id, me.prev_week_start, me.prev_week_end]
      ),
    ])

    const daily: DailyHoursBucket[] = dailyRes.rows.map((r) => ({
      date: r.date,
      hours: Number(r.hours),
      sredHours: Number(r.sred_hours),
    }))

    const byProject: ProjectPulseRow[] = byProjectRes.rows.map((r) => ({
      projectId: r.project_id,
      projectName: r.project_name,
      projectType: r.project_type,
      hours: Number(r.hours),
    }))

    const totalHours = daily.reduce((sum, d) => sum + d.hours, 0)
    const totalSred = daily.reduce((sum, d) => sum + d.sredHours, 0)
    const prevTotal = Number(prevRes.rows[0]?.total ?? 0)

    const body: WeekSummary = {
      weekStart: me.week_start,
      daily,
      byProject,
      totals: {
        hours: totalHours,
        sredHours: totalSred,
        projectsActive: byProject.length,
      },
      deltaFromPrevWeek: totalHours - prevTotal,
    }
    return res.json(body)
  } catch (err) {
    return next(err)
  }
})

export default router
