import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isValidProvince } from '@/lib/provinces'

// Categorías. Por defecto solo las que tienen al menos un negocio de licencia
// activa (para el catálogo público). Con ?all=1 devuelve todas, incluidas las
// vacías (para formularios de creación de negocio).
// Con ?province= además restringe a esa provincia de Cuba.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const provinceParam = searchParams.get('province')
  const province = isValidProvince(provinceParam) ? provinceParam : undefined
  const all = searchParams.get('all') === '1'

  const now = new Date()
  const businessWhere = {
    license: { is: { active: true, endDate: { gte: now } } },
    ...(province && { province }),
  }

  const categories = await db.category.findMany({
    where: all ? {} : { businesses: { some: businessWhere } },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { businesses: { where: all ? {} : businessWhere } } },
    },
  })
  return NextResponse.json(categories)
}
