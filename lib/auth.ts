import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { UserRole } from './constants'

export interface JWTPayload {
  userId: string
  username: string
  role: UserRole
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export function getAuthUser(request: NextRequest): JWTPayload | null {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  return verifyToken(token)
}

export function requireAuth(request: NextRequest, allowedRoles?: UserRole[]): JWTPayload {
  const user = getAuthUser(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error('Forbidden')
  }
  return user
}


