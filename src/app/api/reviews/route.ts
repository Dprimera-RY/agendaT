import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Formato mínimo del hash anónimo de cliente (UUID del localStorage)
function isValidHash(hash: unknown): hash is string {
  return typeof hash === 'string' && /^[a-zA-Z0-9-]{20,64}$/.test(hash)
}

// Reseñas de un negocio: listado + promedio.
// Con ?customerHash= además devuelve si el cliente puede reseñar (cita previa) o ya lo hizo.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  const customerHash = searchParams.get('customerHash')

  if (!businessId) {
    return NextResponse.json({ error: 'businessId es requerido' }, { status: 400 })
  }

  const [reviews, aggregate] = await Promise.all([
    db.review.findMany({
      where: { businessId },
      // El hash nunca se expone públicamente; solo rating, nombre y comentario
      select: { id: true, rating: true, customerName: true, comment: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.review.aggregate({
      where: { businessId },
      _avg: { rating: true },
      _count: true,
    }),
  ])

  let canReview = false
  let alreadyReviewed = false
  if (customerHash && isValidHash(customerHash)) {
    const [existing, pastAppointment] = await Promise.all([
      db.review.findUnique({
        where: { businessId_customerHash: { businessId, customerHash } },
      }),
      db.appointment.findFirst({
        where: {
          businessId,
          customerHash,
          status: { not: 'cancelada' },
        },
      }),
    ])
    alreadyReviewed = !!existing
    canReview = !existing && !!pastAppointment
  }

  return NextResponse.json({
    reviews,
    average: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : null,
    count: aggregate._count,
    canReview,
    alreadyReviewed,
  })
}

// Crear una reseña (público, anónimo). Requiere cita previa y es única por (negocio, hash).
export async function POST(req: NextRequest) {
  try {
    const { businessId, customerHash, customerName, rating, comment } = await req.json()

    if (!businessId || !isValidHash(customerHash)) {
      return NextResponse.json(
        { error: 'Datos de reseña inválidos' },
        { status: 400 }
      )
    }
    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'La valoración debe ser un número entero entre 1 y 5' },
        { status: 400 }
      )
    }

    const business = await db.business.findUnique({ where: { id: businessId } })
    if (!business) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }

    // Debe tener al menos una cita previa (no cancelada) en este negocio
    const pastAppointment = await db.appointment.findFirst({
      where: { businessId, customerHash, status: { not: 'cancelada' } },
    })
    if (!pastAppointment) {
      return NextResponse.json(
        { error: 'Solo puedes reseñar un negocio donde tengas una cita agendada' },
        { status: 403 }
      )
    }

    const existing = await db.review.findUnique({
      where: { businessId_customerHash: { businessId, customerHash } },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Ya dejaste tu reseña en este negocio' },
        { status: 409 }
      )
    }

    const review = await db.review.create({
      data: {
        businessId,
        customerHash,
        customerName:
          typeof customerName === 'string' && customerName.trim()
            ? customerName.trim().slice(0, 60)
            : null,
        rating,
        comment: comment?.trim() ? String(comment).trim().slice(0, 1000) : null,
      },
    })

    // Recalcular promedio para responder con el valor actualizado
    const aggregate = await db.review.aggregate({
      where: { businessId },
      _avg: { rating: true },
      _count: true,
    })

    return NextResponse.json(
      {
        review,
        average: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : null,
        count: aggregate._count,
      },
      { status: 201 }
    )
  } catch (e: any) {
    // Violación de la restricción única (carrera entre dos requests)
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya dejaste tu reseña en este negocio' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
