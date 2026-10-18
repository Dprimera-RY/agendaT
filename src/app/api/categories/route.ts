import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isValidProvince } from '@/lib/provinces'

// Categorías con al menos un negocio de licencia activa.
// Con ?province= además restringe a esa provincia de Cuba.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const provinceParam = searchParams.get('province')
  const province = isValidProvince(provinceParam) ? provinceParam : undefined

  const now = new Date()
  const businessWhere = {
    license: { is: { active: true, endDate: { gte: now } } },
    ...(province && { province }),
  }

  const categories = await db.category.findMany({
    where: { businesses: { some: businessWhere } },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { businesses: { where: businessWhere } } },
    },
  })
  return NextResponse.json(categories)
}
