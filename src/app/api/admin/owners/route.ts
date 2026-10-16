import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Listar todos los dueños
export async function GET() {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const owners = await db.businessOwner.findMany({
    include: {
      _count: { select: { businesses: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(owners)
}

// Crear dueño
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  try {
    const { username, password, name, email, phone } = await req.json()
    if (!username || !password || !name) {
      return NextResponse.json(
        { error: 'username, password y name son requeridos' },
        { status: 400 }
      )
    }
    const existing = await db.businessOwner.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { error: 'El usuario ya existe' },
        { status: 400 }
      )
    }
    const owner = await db.businessOwner.create({
      data: { username, password, name, email, phone },
    })
    return NextResponse.json(owner, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

// Eliminar dueño
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }
  await db.businessOwner.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
