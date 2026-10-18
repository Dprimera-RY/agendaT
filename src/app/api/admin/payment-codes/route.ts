import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Lista de códigos de pago generados por los dueños (más recientes primero)
export async function GET() {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const codes = await db.paymentCode.findMany({
    include: { business: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(codes)
}

// Aplicar un código de pago: crea o renueva la licencia del negocio y marca el código como pagado.
// Body: { code: string }
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { code } = await req.json()
  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
    return NextResponse.json({ error: 'Código inválido (6 dígitos)' }, { status: 400 })
  }

  const payment = await db.paymentCode.findUnique({
    where: { code: code.trim() },
    include: { business: { include: { license: true } } },
  })
  if (!payment) {
    return NextResponse.json({ error: 'Código no encontrado' }, { status: 404 })
  }
  if (payment.status !== 'pendiente') {
    return NextResponse.json(
      { error: `El código ya fue ${payment.status === 'pagada' ? 'aplicado' : 'rechazado'}` },
      { status: 409 }
    )
  }

  // Certificación: al aplicar el código se certifica el negocio
  if (payment.kind === 'certificacion') {
    await db.$transaction([
      db.business.update({
        where: { id: payment.businessId },
        data: { certified: true, certifiedAt: new Date() },
      }),
      db.paymentCode.update({
        where: { id: payment.id },
        data: { status: 'pagada' },
      }),
    ])
    return NextResponse.json({
      ok: true,
      business: payment.business.name,
      certified: true,
    })
  }

  const now = new Date()
  const existing = payment.business.license
  let startDate = now
  if (existing) {
    // Si la licencia sigue vigente, extiende desde su fecha actual de fin
    startDate = existing.endDate > now ? existing.endDate : now
  }
  const endDate = new Date(startDate.getTime() + payment.durationDays * 24 * 60 * 60 * 1000)

  await db.$transaction([
    existing
      ? db.license.update({
          where: { businessId: payment.businessId },
          data: {
            startDate,
            endDate,
            durationDays: payment.durationDays,
            active: true,
          },
        })
      : db.license.create({
          data: {
            businessId: payment.businessId,
            startDate,
            endDate,
            durationDays: payment.durationDays,
            active: true,
          },
        }),
    db.paymentCode.update({
      where: { id: payment.id },
      data: { status: 'pagada' },
    }),
  ])

  return NextResponse.json({
    ok: true,
    business: payment.business.name,
    plan: payment.planName,
    durationDays: payment.durationDays,
    endDate,
  })
}

// Rechazar un código (marcado manualmente por el asesor)
// Body: { id: string }
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { id } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  }
  const payment = await db.paymentCode.findUnique({ where: { id } })
  if (!payment) {
    return NextResponse.json({ error: 'Código no encontrado' }, { status: 404 })
  }
  if (payment.status !== 'pendiente') {
    return NextResponse.json({ error: 'Solo se pueden rechazar códigos pendientes' }, { status: 409 })
  }
  const updated = await db.paymentCode.update({ where: { id }, data: { status: 'rechazada' } })
  return NextResponse.json(updated)
}
