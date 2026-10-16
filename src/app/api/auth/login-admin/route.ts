import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      )
    }
    const admin = await db.admin.findUnique({ where: { username } })
    if (!admin || admin.password !== password) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }
    await setSession({
      role: 'admin',
      adminId: admin.id,
      name: admin.name,
      username: admin.username,
    })
    return NextResponse.json({
      role: 'admin',
      name: admin.name,
      username: admin.username,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
