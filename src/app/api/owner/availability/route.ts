import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Listar disponibilidades de un negocio
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'owner' && session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  if (!businessId) {
    return NextResponse.json({ error: 'businessId requerido' }, { status: 400 })
  }
  const availabilities = await db.availability.findMany({
    where: { businessId },
    orderBy: { dayOfWeek: 'asc' },
  })
  return NextResponse.json(availabilities)
}

// Crear o actualizar disponibilidad (upsert por día)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'owner' && session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  try {
    const { businessId, dayOfWeek, startTime, endTime, active, breakStart, breakEnd } = await req.json()
    if (!businessId || dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Faltan campos' },
        { status: 400 }
      )
    }
    const timeRe = /^\d{2}:\d{2}$/
    const bs = typeof breakStart === 'string' && timeRe.test(breakStart) ? breakStart : null
    const be = typeof breakEnd === 'string' && timeRe.test(breakEnd) ? breakEnd : null
    if ((bs && !be) || (!bs && be)) {
      return NextResponse.json(
        { error: 'El horario de almuerzo necesita inicio y fin (o ninguno)' },
        { status: 400 }
      )
    }
    if (bs && be && bs >= be) {
      return NextResponse.json(
        { error: 'El inicio del almuerzo debe ser antes del fin' },
        { status: 400 }
      )
    }
    const business = await db.business.findUnique({ where: { id: businessId } })
    if (!business) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }
    if (session.role === 'owner' && business.ownerId !== session.ownerId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Verificar si ya existe para ese día
    const existing = await db.availability.findFirst({
      where: { businessId, dayOfWeek },
    })
    let result
    if (existing) {
      result = await db.availability.update({
        where: { id: existing.id },
        data: { startTime, endTime, active: active ?? true, breakStart: bs, breakEnd: be },
      })
    } else {
      result = await db.availability.create({
        data: { businessId, dayOfWeek, startTime, endTime, active: active ?? true, breakStart: bs, breakEnd: be },
      })
    }
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

// Eliminar disponibilidad
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'owner' && session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }
  await db.availability.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
