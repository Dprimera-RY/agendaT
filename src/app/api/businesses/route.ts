import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isValidProvince } from '@/lib/provinces'

// Lista todos los negocios (con filtros por categoría, nombre y provincia)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId')
  const q = searchParams.get('q')?.toLowerCase().trim()
  const province = searchParams.get('province')

  const where: {
    categoryId?: string
    province?: string
    OR?: Array<{
      name?: { contains: string }
      description?: { contains: string }
      services?: { some: { name: { contains: string } } }
    }>
  } = {}

  if (categoryId) where.categoryId = categoryId
  if (province && isValidProvince(province)) where.province = province
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
      // La búsqueda también debe encontrar negocios por el nombre de sus servicios
      { services: { some: { name: { contains: q } } } },
    ]
  }

  const businesses = await db.business.findMany({
    where,
    include: {
      category: true,
      license: true,
      services: { where: { active: true } },
      reviews: { select: { rating: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Filtrar sólo los que tienen licencia activa Y al menos un servicio activo
  const now = new Date()
  const filtered = businesses
    .filter((b) => {
      if (!b.license) return false
      if (!b.license.active) return false
      if (b.license.endDate < now) return false
      if (!b.services || b.services.length === 0) return false
      return true
    })
    .map(({ reviews, ...b }) => {
      const rating =
        reviews.length > 0
          ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
          : null
      return { ...b, rating, reviewCount: reviews.length }
    })

  // Orden: certificados primero, y en cada grupo por rating (sin rating al
  // final) y en empates por nombre.
  filtered.sort((a, b) => {
    if (a.certified !== b.certified) return a.certified ? -1 : 1
    const ra = a.rating ?? -1
    const rb = b.rating ?? -1
    if (ra !== rb) return rb - ra
    return a.name.localeCompare(b.name, 'es')
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
      province,
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
    if (province !== undefined && province !== null && province !== '' && !isValidProvince(province)) {
      return NextResponse.json({ error: 'Provincia inválida' }, { status: 400 })
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
        province: province || null,
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
