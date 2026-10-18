import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Registrar una visita a la página pública de un negocio (público, fire-and-forget)
export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json()
    if (!businessId) {
      return NextResponse.json({ error: 'businessId requerido' }, { status: 400 })
    }
    const business = await db.business.findUnique({ where: { id: businessId } })
    if (!business) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }
    await db.visit.create({ data: { businessId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al registrar visita' }, { status: 500 })
  }
}
