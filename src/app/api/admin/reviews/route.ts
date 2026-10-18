import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Gestión de reseñas por el administrador (moderación antidifamación).
// GET: listar todas · PATCH: editar (nombre, estrellas, comentario) · DELETE: eliminar
export async function GET() {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const reviews = await db.review.findMany({
    include: { business: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: 300,
  })
  return NextResponse.json(reviews)
}

// Editar una reseña (puede corregir contenido difamatorio sin eliminarla)
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  try {
    const { id, rating, comment, customerName } = await req.json()
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    const data: Record<string, unknown> = {}
    if (rating !== undefined) {
      const r = Number(rating)
      if (!Number.isInteger(r) || r < 1 || r > 5) {
        return NextResponse.json({ error: 'La valoración debe ser 1-5' }, { status: 400 })
      }
      data.rating = r
    }
    if (comment !== undefined) {
      if (typeof comment !== 'string' || comment.length > 1000) {
        return NextResponse.json({ error: 'Comentario inválido (máx. 1000)' }, { status: 400 })
      }
      data.comment = comment.trim() || null
    }
    if (customerName !== undefined) {
      if (typeof customerName !== 'string' || customerName.length > 60) {
        return NextResponse.json({ error: 'Nombre inválido (máx. 60)' }, { status: 400 })
      }
      data.customerName = customerName.trim() || null
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
    }

    const review = await db.review.update({
      where: { id },
      data,
      include: { business: { select: { id: true, name: true, slug: true } } },
    })
    return NextResponse.json(review)
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: 'Reseña no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 })
  }
}

// Eliminar una reseña
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  try {
    const { searchParams } = new URL(req.url)
    const bodyId = await req.json().then((b) => b?.id).catch(() => null)
    const id = bodyId || searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    await db.review.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: 'Reseña no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 })
  }
}
