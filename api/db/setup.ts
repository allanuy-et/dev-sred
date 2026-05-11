import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from '../src/db.js'
import { seed } from './seed.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  const schemaPath = resolve(__dirname, 'schema.sql')
  const schema = readFileSync(schemaPath, 'utf8')

  console.log('[db:setup] applying schema.sql')
  await pool.query(schema)

  console.log('[db:setup] seeding')
  await seed()

  console.log('[db:setup] done')
  await pool.end()
}

main().catch((err) => {
  console.error('[db:setup] failed:', err)
  process.exit(1)
})
