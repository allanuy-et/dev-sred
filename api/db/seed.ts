import bcrypt from 'bcryptjs'
import { pool } from '../src/db.js'

export async function seed() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Wipe existing data (keep deterministic IDs across runs).
    await client.query('TRUNCATE labour_entries, expenses, projects, users, companies RESTART IDENTITY CASCADE')

    // Company
    const companyRes = await client.query<{ id: string }>(
      `INSERT INTO companies (name, business_number, address1, city, province, postal_code, phone1, email, website, fiscal_year_end, financial_contact, timezone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        'Extreme Technology Corporation',
        '87309 4809RT001',
        '210 Martindale Road, Unit C',
        'St. Catharines',
        'Ontario',
        'L2S 0B2',
        '905.684.0876',
        'info@etcweb.com',
        'www.etcweb.com',
        '2026-09-30',
        'Anita Philpott',
        'America/Toronto',
      ]
    )
    const companyId = companyRes.rows[0].id

    // Users
    const passwordHash = await bcrypt.hash('password', 10)
    const employees = [
      { email: 'scott@etcweb.com', first: 'Scott', last: 'Holmes', role: 'CEO', access: 'admin', rate: 36.06, specified: true },
      { email: 'derek@etcweb.com', first: 'Derek', last: 'Gibson', role: 'Support & Development Coordinator', access: 'admin', rate: 28.5, specified: false },
      { email: 'sarah@etcweb.com', first: 'Sarah', last: 'Aymar', role: 'Business Development Manager', access: 'standard', rate: 32.0, specified: false },
      { email: 'joel@etcweb.com', first: 'Joel', last: 'Barnard', role: 'Mobile Application Developer', access: 'standard', rate: 35.0, specified: false },
      { email: 'corey@etcweb.com', first: 'Corey', last: 'Saldarelli', role: 'Software Developer', access: 'standard', rate: 34.0, specified: false },
    ]

    const userIds: Record<string, string> = {}
    for (const e of employees) {
      const res = await client.query<{ id: string }>(
        `INSERT INTO users (company_id, email, password_hash, first_name, last_name, role, access_level, regular_rate, specified_employee, start_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id`,
        [companyId, e.email, passwordHash, e.first, e.last, e.role, e.access, e.rate, e.specified, '2014-10-01']
      )
      userIds[e.email] = res.rows[0].id
    }

    // Projects
    const projects = [
      { name: 'ET Grow', type: 'sred', phase: 'concept', startDate: '2012-01-27', manager: 'scott@etcweb.com' },
      { name: 'Game on Mobile', type: 'sred', phase: 'concept', startDate: '2010-01-27', manager: 'joel@etcweb.com' },
      { name: 'IPTV Proprietary Solution Development', type: 'sred', phase: 'concept', startDate: '2022-01-01', manager: 'scott@etcweb.com' },
    ]

    const projectIds: Record<string, string> = {}
    for (const p of projects) {
      const res = await client.query<{ id: string }>(
        `INSERT INTO projects (company_id, name, type, phase, start_date, project_manager_id)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id`,
        [companyId, p.name, p.type, p.phase, p.startDate, userIds[p.manager]]
      )
      projectIds[p.name] = res.rows[0].id
    }

    // Sample labour entries (mirrors prototype)
    const iptv = projectIds['IPTV Proprietary Solution Development']
    const scott = userIds['scott@etcweb.com']
    const labourSeed = [
      { date: '2026-05-04', hours: 8, type: 'test_and_measurement', evidence: 'design_of_experiments', notes: 'Developed performance benchmark testing procedures and hardware resource baselines.' },
      { date: '2026-05-05', hours: 8, type: 'test_and_measurement', evidence: 'design_of_experiments', notes: 'Continued benchmark work.' },
      { date: '2026-05-06', hours: 8, type: 'test_and_measurement', evidence: 'design_of_experiments', notes: 'Analyzed AC current load.' },
    ]
    for (const l of labourSeed) {
      await client.query(
        `INSERT INTO labour_entries (date, employee_id, project_id, hours, labour_time, labour_type, objective_evidence, notes)
         VALUES ($1,$2,$3,$4,'regular',$5,$6,$7)`,
        [l.date, scott, iptv, l.hours, l.type, l.evidence, l.notes]
      )
    }

    await client.query('COMMIT')
    console.log('[seed] inserted company, 5 users, 3 projects, 3 labour entries')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// Allow running directly: `tsx db/seed.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
