import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Lista todos los negocios (con filtros por categoría y nombre)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId')
  const q = searchParams.get('q')?.toLowerCase().trim()

  const where: {
    categoryId?: string
    OR?: Array<{ name?: { contains: string }; description?: { contains: string } }>
  } = {}

  if (categoryId) where.categoryId = categoryId
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
    ]
  }

  const businesses = await db.business.findMany({
    where,
    include: {
      category: true,
      license: true,
      services: { where: { active: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Filtrar sólo los que tienen licencia activa
  const now = new Date()
  const filtered = businesses.filter((b) => {
    if (!b.license) return false
    if (!b.license.active) return false
    if (b.license.endDate < now) return false
    return true
  })

  return NextResponse.json(filtered)
}

// Crear un nuevo negocio (solo admin)
export async function POST(req: NextRequest) {
  const { getSession } = await import('@/lib/auth')
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
      logo,
      photo1,
      photo2,
      photo3,
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

    // Verificar que el slug no exista
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
        logo,
        photo1,
        photo2,
        photo3,
        address,
        phone,
        email,
        ownerId,
        categoryId,
      },
    })

    // Crear licencia inicial
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
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
