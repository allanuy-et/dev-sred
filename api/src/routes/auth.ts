import { Router } from 'express'
import bcrypt from 'bcrypt'
import type { LoginResponse } from '@sred/shared'
import { query } from '../db.js'
import {
  AUTH_COOKIE_NAME,
  clearCookieOptions,
  cookieOptions,
  signToken,
} from '../auth.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

// Row shape for the columns we select. snake_case from pg.
interface UserAuthRow {
  id: string
  email: string
  password_hash: string
  first_name: string
  last_name: string
  access_level: 'admin' | 'standard' | 'limited'
}

function toLoginResponse(row: UserAuthRow): LoginResponse {
  return {
    user: {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      accessLevel: row.access_level,
    },
  }
}

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {}
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const result = await query<UserAuthRow>(
      `SELECT id, email, password_hash, first_name, last_name, access_level
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    )
    const row = result.rows[0]

    // Constant-ish-time: always run a bcrypt compare to avoid trivial timing leak
    // about whether the user exists. Compare against a fixed dummy hash if no row.
    const hash = row?.password_hash ?? '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali'
    const ok = await bcrypt.compare(password, hash)
    if (!row || !ok) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = signToken({
      userId: row.id,
      email: row.email,
      accessLevel: row.access_level,
    })
    res.cookie(AUTH_COOKIE_NAME, token, cookieOptions())
    return res.json(toLoginResponse(row))
  } catch (err) {
    return next(err)
  }
})

router.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, clearCookieOptions())
  return res.json({ ok: true })
})

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId
    const result = await query<UserAuthRow>(
      `SELECT id, email, password_hash, first_name, last_name, access_level
       FROM users
       WHERE id = $1`,
      [userId]
    )
    const row = result.rows[0]
    if (!row) {
      // Token references a user that no longer exists — clear the cookie.
      res.clearCookie(AUTH_COOKIE_NAME, clearCookieOptions())
      return res.status(401).json({ error: 'Not authenticated' })
    }
    return res.json(toLoginResponse(row))
  } catch (err) {
    return next(err)
  }
})

export default router
