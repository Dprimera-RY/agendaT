import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Listar todos los negocios (admin)
export async function GET() {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const businesses = await db.business.findMany({
    include: {
      category: true,
      license: true,
      owner: true,
      _count: { select: { appointments: true, services: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(businesses)
}

// Crear negocio desde el panel admin
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  try {
    const data = await req.json()
    const {
      name,
      slug,
      description,
      address,
      phone,
      email,
      ownerId,
      categoryId,
      licenseDays,
    } = data

    if (!name || !slug || !ownerId || !categoryId) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }
    const existing = await db.business.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        { error: 'El slug ya está en uso' },
        { status: 400 }
      )
    }

    const business = await db.business.create({
      data: {
        name,
        slug,
        description,
        address,
        phone,
        email,
        ownerId,
        categoryId,
      },
    })

    const days = Number(licenseDays) || 30
    const now = new Date()
    await db.license.create({
      data: {
        businessId: business.id,
        startDate: now,
        endDate: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
        durationDays: days,
        active: true,
      },
    })

    return NextResponse.json(business, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

// Eliminar negocio
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
  await db.business.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
