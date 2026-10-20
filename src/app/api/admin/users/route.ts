import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Gestión de usuarios administradores (el rol admin soporta varias cuentas).
// GET: lista de admins sin contraseñas.
export async function GET() {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const admins = await db.admin.findMany({
    select: { id: true, username: true, name: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(admins)
}

// POST: crear un nuevo admin. Body: { name, username, password }
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { name, username, password } = await req.json()
  const n = typeof name === 'string' ? name.trim() : ''
  const u = typeof username === 'string' ? username.trim() : ''
  const p = typeof password === 'string' ? password : ''
  if (!n || !u || !p) {
    return NextResponse.json({ error: 'Nombre, usuario y contraseña son obligatorios' }, { status: 400 })
  }
  if (p.length < 4) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, { status: 400 })
  }
  const exists = await db.admin.findUnique({ where: { username: u } })
  if (exists) {
    return NextResponse.json({ error: 'El usuario ya existe' }, { status: 409 })
  }
  const created = await db.admin.create({
    data: { name: n, username: u, password: p },
    select: { id: true, username: true, name: true, createdAt: true, updatedAt: true },
  })
  return NextResponse.json(created, { status: 201 })
}

// PATCH: edición completa de un admin. Body: { id, name?, username?, password? }
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { id, name, username, password } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }
  const target = await db.admin.findUnique({ where: { id } })
  if (!target) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  const data: { name?: string; username?: string; password?: string } = {}
  if (typeof name === 'string' && name.trim()) data.name = name.trim()
  if (typeof username === 'string' && username.trim()) {
    const u = username.trim()
    if (u !== target.username) {
      const dup = await db.admin.findUnique({ where: { username: u } })
      if (dup) {
        return NextResponse.json({ error: 'El usuario ya existe' }, { status: 409 })
      }
    }
    data.username = u
  }
  if (typeof password === 'string' && password) {
    if (password.length < 4) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, { status: 400 })
    }
    data.password = password
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Indica qué campos actualizar' }, { status: 400 })
  }

  const updated = await db.admin.update({
    where: { id },
    data,
    select: { id: true, username: true, name: true, createdAt: true, updatedAt: true },
  })
  return NextResponse.json(updated)
}

// DELETE: elimina un admin (?id=). No permite eliminarse a sí mismo.
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }
  if (session.adminId === id) {
    return NextResponse.json(
      { error: 'No puedes eliminar tu propia cuenta' },
      { status: 400 }
    )
  }
  const target = await db.admin.findUnique({ where: { id } })
  if (!target) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }
  const total = await db.admin.count()
  if (total <= 1) {
    return NextResponse.json(
      { error: 'Debe quedar al menos un administrador' },
      { status: 400 }
    )
  }
  await db.admin.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
