import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Listar todas las licencias
export async function GET() {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const licenses = await db.license.findMany({
    include: { business: { select: { id: true, name: true, slug: true } } },
    orderBy: { endDate: 'desc' },
  })
  return NextResponse.json(licenses)
}

// Crear o actualizar licencia (extender tiempo de uso)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  try {
    const { businessId, addDays, action } = await req.json()
    if (!businessId) {
      return NextResponse.json({ error: 'businessId requerido' }, { status: 400 })
    }

    const existing = await db.license.findUnique({
      where: { businessId },
      include: { business: true },
    })

    if (action === 'activate' || action === 'deactivate') {
      if (!existing) {
        return NextResponse.json({ error: 'Licencia no encontrada' }, { status: 404 })
      }
      const updated = await db.license.update({
        where: { businessId },
        data: { active: action === 'activate' },
      })
      return NextResponse.json(updated)
    }

    const days = Number(addDays) || 30
    const now = new Date()

    if (existing) {
      // Si la licencia sigue activa, sumar desde el final; si expiró, desde ahora
      const baseDate = existing.active && existing.endDate > now
        ? existing.endDate
        : now
      const newEndDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)
      const updated = await db.license.update({
        where: { businessId },
        data: {
          endDate: newEndDate,
          durationDays: existing.durationDays + days,
          active: true,
          startDate: existing.startDate > now ? now : existing.startDate,
        },
      })
      return NextResponse.json(updated)
    } else {
      // Crear nueva licencia
      const license = await db.license.create({
        data: {
          businessId,
          startDate: now,
          endDate: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
          durationDays: days,
          active: true,
        },
      })
      return NextResponse.json(license, { status: 201 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
