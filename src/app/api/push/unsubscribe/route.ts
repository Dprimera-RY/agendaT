import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Eliminar una suscripción (por endpoint) cuando el usuario desactiva notificaciones
export async function POST(req: NextRequest) {
  try {
    const { endpoint } = await req.json()
    if (typeof endpoint !== 'string' || !endpoint) {
      return NextResponse.json({ error: 'endpoint requerido' }, { status: 400 })
    }
    await db.pushSubscription.deleteMany({ where: { endpoint } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
