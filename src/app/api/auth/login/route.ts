import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSession } from '@/lib/auth'

// LOGIN UNIFICADO: detecta automáticamente si el usuario es admin o dueño
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // 1. Intentar como admin
    const admin = await db.admin.findUnique({ where: { username } })
    if (admin && admin.password === password) {
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
        redirect: '/admin',
      })
    }

    // 2. Intentar como dueño de negocio
    const owner = await db.businessOwner.findUnique({
      where: { username },
      include: {
        businesses: {
          select: { id: true, slug: true, name: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (owner && owner.password === password) {
      await setSession({
        role: 'owner',
        ownerId: owner.id,
        name: owner.name,
        username: owner.username,
      })
      // Si tiene al menos un negocio, ir al panel del primero; si no, al wizard de crear negocio
      const redirect =
        owner.businesses.length > 0
          ? `/negocio/${owner.businesses[0].slug}/panel`
          : '/crear-negocio'
      return NextResponse.json({
        role: 'owner',
        name: owner.name,
        username: owner.username,
        businesses: owner.businesses,
        redirect,
      })
    }

    return NextResponse.json(
      { error: 'Usuario o contraseña incorrectos' },
      { status: 401 }
    )
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
