import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// PATCH /api/auth/change-password
// Body: { currentPassword, newPassword } — cambia la contraseña del admin logueado.
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session?.adminId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    const { currentPassword, newPassword } = await req.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Contraseña actual y nueva son requeridas' },
        { status: 400 }
      )
    }
    if (typeof newPassword !== 'string' || newPassword.length < 4) {
      return NextResponse.json(
        { error: 'La contraseña nueva debe tener al menos 4 caracteres' },
        { status: 400 }
      )
    }
    const admin = await db.admin.findUnique({ where: { id: session.adminId } })
    if (!admin) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }
    if (admin.password !== currentPassword) {
      return NextResponse.json(
        { error: 'La contraseña actual es incorrecta' },
        { status: 400 }
      )
    }
    await db.admin.update({
      where: { id: admin.id },
      data: { password: newPassword },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
