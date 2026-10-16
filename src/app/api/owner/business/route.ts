import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Obtener todos los negocios del owner logueado
export async function GET() {
  const session = await getSession()
  if (session.role !== 'owner' && session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (session.role === 'admin') {
    // El admin ve todos los negocios
    const businesses = await db.business.findMany({
      include: { category: true, license: true, owner: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(businesses)
  }

  const businesses = await db.business.findMany({
    where: { ownerId: session.ownerId },
    include: { category: true, license: true },
  })
  return NextResponse.json(businesses)
}

// Actualizar datos de un negocio (nombre, logo, fotos, etc.)
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'owner' && session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const data = await req.json()
    const {
      businessId,
      name,
      description,
      logo,
      photo1,
      photo2,
      photo3,
      address,
      phone,
      email,
    } = data

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId es requerido' },
        { status: 400 }
      )
    }

    const business = await db.business.findUnique({
      where: { id: businessId },
    })
    if (!business) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }
    if (session.role === 'owner' && business.ownerId !== session.ownerId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const updated = await db.business.update({
      where: { id: businessId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(logo !== undefined && { logo }),
        ...(photo1 !== undefined && { photo1 }),
        ...(photo2 !== undefined && { photo2 }),
        ...(photo3 !== undefined && { photo3 }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
      },
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
