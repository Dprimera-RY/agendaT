import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// El dueño genera un código de pago de 6 dígitos al elegir un plan;
// con ese código contacta al asesor (WhatsApp) para pagar la suscripción.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'owner' && session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { businessId, planId } = await req.json()
  if (!businessId || !planId) {
    return NextResponse.json({ error: 'businessId y planId son requeridos' }, { status: 400 })
  }

  const business = await db.business.findUnique({ where: { id: businessId } })
  if (!business) {
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
  }
  if (session.role === 'owner' && business.ownerId !== session.ownerId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const plan = await db.plan.findUnique({ where: { id: planId } })
  if (!plan || !plan.active) {
    return NextResponse.json({ error: 'Plan no disponible' }, { status: 400 })
  }

  // Generar código de 6 dígitos único
  let code = ''
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = String(Math.floor(100000 + Math.random() * 900000))
    const exists = await db.paymentCode.findUnique({ where: { code: candidate } })
    if (!exists) {
      code = candidate
      break
    }
  }
  if (!code) {
    return NextResponse.json({ error: 'No se pudo generar un código, intenta de nuevo' }, { status: 500 })
  }

  const created = await db.paymentCode.create({
    data: {
      code,
      businessId,
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
    },
  })

  return NextResponse.json(
    {
      id: created.id,
      code: created.code,
      planName: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
    },
    { status: 201 }
  )
}
