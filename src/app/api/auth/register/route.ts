import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSession } from '@/lib/auth'

// REGISTRO de un nuevo dueño de negocio
export async function POST(req: NextRequest) {
  try {
    const { name, username, password, email, phone } = await req.json()

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: 'Nombre, usuario y contraseña son obligatorios' },
        { status: 400 }
      )
    }
    if (password.length < 4) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 4 caracteres' },
        { status: 400 }
      )
    }

    // Verificar que el username no exista ni en admin ni en owner
    const [existingAdmin, existingOwner] = await Promise.all([
      db.admin.findUnique({ where: { username } }),
      db.businessOwner.findUnique({ where: { username } }),
    ])
    if (existingAdmin || existingOwner) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya está en uso' },
        { status: 400 }
      )
    }

    const owner = await db.businessOwner.create({
      data: {
        name,
        username,
        password,
        email,
        phone,
      },
    })

    await setSession({
      role: 'owner',
      ownerId: owner.id,
      name: owner.name,
      username: owner.username,
    })

    return NextResponse.json(
      {
        role: 'owner',
        name: owner.name,
        username: owner.username,
        redirect: '/crear-negocio',
      },
      { status: 201 }
    )
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
