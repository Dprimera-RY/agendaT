import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Obtiene un negocio por su slug con todos sus datos públicos
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'slug requerido' }, { status: 400 })
  }
  const business = await db.business.findUnique({
    where: { slug },
    include: {
      category: true,
      license: true,
      services: { where: { active: true }, orderBy: { price: 'asc' } },
      availabilities: { where: { active: true } },
    },
  })
  if (!business) {
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
  }
  return NextResponse.json(business)
}
