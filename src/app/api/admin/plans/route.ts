import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Listar todos los planes (solo admin)
export async function GET() {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const plans = await db.plan.findMany({ orderBy: { durationDays: 'asc' } })
  return NextResponse.json(plans)
}

// Crear un plan (solo admin)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  try {
    const { name, durationDays, price } = await req.json()
    if (!name || !durationDays || price === undefined) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }
    const plan = await db.plan.create({
      data: {
        name: String(name).trim(),
        durationDays: Number(durationDays),
        price: Number(price),
      },
    })
    return NextResponse.json(plan, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 })
  }
}

// Editar un plan (solo admin)
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  try {
    const { id, name, durationDays, price, active } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }
    const plan = await db.plan.findUnique({ where: { id } })
    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }
    const updated = await db.plan.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(durationDays !== undefined && { durationDays: Number(durationDays) }),
        ...(price !== undefined && { price: Number(price) }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 })
  }
}
