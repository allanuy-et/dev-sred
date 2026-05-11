// One-off: apply schema.sql to the existing DB without truncating data.
// Used to migrate in the wage_history table + backfill rows for current users
// without losing whatever's already seeded. Idempotent — `CREATE TABLE IF NOT
// EXISTS` + `INSERT … WHERE NOT EXISTS` make repeated runs safe.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from '../src/db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  const schemaPath = resolve(__dirname, 'schema.sql')
  const schema = readFileSync(schemaPath, 'utf8')
  console.log('[db:migrate] applying schema.sql (no truncate, no reseed)')
  await pool.query(schema)
  console.log('[db:migrate] done')
  await pool.end()
}

main().catch((err) => {
  console.error('[db:migrate] failed:', err)
  process.exit(1)
})
