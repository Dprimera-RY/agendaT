import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Listar servicios de un negocio
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  if (!businessId) {
    return NextResponse.json({ error: 'businessId requerido' }, { status: 400 })
  }
  const services = await db.service.findMany({
    where: { businessId },
    orderBy: { price: 'asc' },
  })
  return NextResponse.json(services)
}

// Crear servicio
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'owner' && session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  try {
    const { businessId, name, description, price, currency, durationMin, color } = await req.json()
    if (!businessId || !name || price === undefined) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }
    const business = await db.business.findUnique({ where: { id: businessId } })
    if (!business) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }
    if (session.role === 'owner' && business.ownerId !== session.ownerId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    if (color !== undefined && color !== null && color !== '' && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return NextResponse.json({ error: 'Color inválido (usa #rrggbb)' }, { status: 400 })
    }
    const service = await db.service.create({
      data: {
        businessId,
        name,
        description,
        price: Number(price),
        currency: (typeof currency === 'string' && currency.trim()) ? currency.trim().toUpperCase() : 'CUP',
        durationMin: Number(durationMin) || 30,
        color: color || null,
      },
    })
    return NextResponse.json(service, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

// Actualizar servicio
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'owner' && session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  try {
    const { id, name, description, price, currency, durationMin, active, color } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }
    const service = await db.service.findUnique({
      where: { id },
      include: { business: true },
    })
    if (!service) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })
    }
    if (session.role === 'owner' && service.business.ownerId !== session.ownerId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    if (color !== undefined && color !== null && color !== '' && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return NextResponse.json({ error: 'Color inválido (usa #rrggbb)' }, { status: 400 })
    }
    const updated = await db.service.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(currency !== undefined && { currency: (typeof currency === 'string' && currency.trim()) ? currency.trim().toUpperCase() : 'CUP' }),
        ...(durationMin !== undefined && { durationMin: Number(durationMin) }),
        ...(active !== undefined && { active }),
        ...(color !== undefined && { color: color || null }),
      },
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

// Eliminar servicio
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
  const service = await db.service.findUnique({
    where: { id },
    include: { business: true },
  })
  if (!service) {
    return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })
  }
  if (session.role === 'owner' && service.business.ownerId !== session.ownerId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  await db.service.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
