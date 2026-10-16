// Helpers de autenticación y sesión (server-side)
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export type SessionRole = 'admin' | 'owner' | null

export interface Session {
  role: SessionRole
  adminId?: string
  ownerId?: string
  name?: string
  username?: string
}

const SESSION_COOKIE = 'agenda_session'

// Codifica/decodifica la sesión en base64 (simple, no production-grade)
function encode(session: Session): string {
  return Buffer.from(JSON.stringify(session)).toString('base64')
}

function decode(token: string): Session | null {
  try {
    const json = Buffer.from(token, 'base64').toString('utf-8')
    return JSON.parse(json) as Session
  } catch {
    return null
  }
}

export async function getSession(): Promise<Session> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return { role: null }
  const session = decode(token)
  if (!session) return { role: null }

  // Validar que el usuario siga existiendo
  if (session.role === 'admin' && session.adminId) {
    const admin = await db.admin.findUnique({ where: { id: session.adminId } })
    if (!admin) return { role: null }
    return session
  }
  if (session.role === 'owner' && session.ownerId) {
    const owner = await db.businessOwner.findUnique({ where: { id: session.ownerId } })
    if (!owner) return { role: null }
    return session
  }
  return { role: null }
}

export async function setSession(session: Session) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, encode(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

// Middleware helper: requiere rol admin
export async function requireAdmin(): Promise<Session | null> {
  const session = await getSession()
  if (session.role !== 'admin') return null
  return session
}

// Middleware helper: requiere rol owner (o admin)
export async function requireOwner(): Promise<Session | null> {
  const session = await getSession()
  if (session.role !== 'owner' && session.role !== 'admin') return null
  return session
}
