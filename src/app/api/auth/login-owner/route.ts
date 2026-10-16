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
    const owner = await db.businessOwner.findUnique({ where: { username } })
    if (!owner || owner.password !== password) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }
    await setSession({
      role: 'owner',
      ownerId: owner.id,
      name: owner.name,
      username: owner.username,
    })
    return NextResponse.json({
      role: 'owner',
      name: owner.name,
      username: owner.username,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
