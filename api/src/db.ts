import pg from 'pg'

const { Pool, types } = pg

// Postgres DATE (oid 1082) — return as the raw `yyyy-mm-dd` string instead of
// `pg`'s default JS Date conversion. Calendar dates are timezone-independent;
// converting through a Date object in the server's local tz can shift the
// calendar day (e.g. server runs east of UTC → DATE '2026-05-16' becomes a
// Date whose UTC parts read 2026-05-15). Keeping the string preserves the
// stored value exactly.
types.setTypeParser(1082, (val: string) => val)

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'require' ? { rejectUnauthorized: false } : undefined,
})

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as never)
}
