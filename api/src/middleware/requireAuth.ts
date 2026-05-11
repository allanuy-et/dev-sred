import type { NextFunction, Request, Response } from 'express'
import type { AuthUser } from '@sred/shared'
import { AUTH_COOKIE_NAME, verifyToken } from '../auth.js'

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME]
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  const user = verifyToken(token)
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }
  req.user = user
  next()
}
