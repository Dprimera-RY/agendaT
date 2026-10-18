import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Planes/suscripciones ofrecidos (público: los ve el dueño en su tab Licencia)
// Si no existen, crea los dos por defecto (mes 500 CUP, año 5000 CUP).
export async function GET() {
  let plans = await db.plan.findMany({ orderBy: { durationDays: 'asc' } })
  if (plans.length === 0) {
    await db.plan.createMany({
      data: [
        { name: 'Mensual', durationDays: 30, price: 500 },
        { name: 'Anual', durationDays: 365, price: 5000 },
      ],
    })
    plans = await db.plan.findMany({ orderBy: { durationDays: 'asc' } })
  }
  return NextResponse.json(plans)
}
