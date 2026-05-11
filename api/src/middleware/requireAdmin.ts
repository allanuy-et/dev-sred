import type { NextFunction, Request, Response } from 'express'

/**
 * Gate a route behind admin access. Assumes `requireAuth` has already run
 * (so `req.user` is populated). Returns 403 with an explicit message for
 * non-admins.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.accessLevel !== 'admin') {
    return res.status(403).json({
      error: 'This action is restricted to administrators.',
    })
  }
  next()
}
