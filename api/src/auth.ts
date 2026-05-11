import jwt from 'jsonwebtoken'
import type { AuthUser } from '@sred/shared'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set')
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days
export const AUTH_COOKIE_NAME = 'sred_session'

export function signToken(payload: AuthUser): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: TOKEN_TTL_SECONDS })
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as jwt.JwtPayload & AuthUser
    return { userId: decoded.userId, email: decoded.email, accessLevel: decoded.accessLevel }
  } catch {
    return null
  }
}

export function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: TOKEN_TTL_SECONDS * 1000,
  }
}
