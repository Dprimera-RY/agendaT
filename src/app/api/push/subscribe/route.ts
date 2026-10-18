import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Guardar una suscripción Web Push.
// targetType "owner" requiere sesión de dueño; "customer" usa el customerHash del cliente.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subscription, targetType, targetId, businessId } = body || {}

    if (
      !subscription ||
      typeof subscription.endpoint !== 'string' ||
      !subscription.keys ||
      typeof subscription.keys.p256dh !== 'string' ||
      typeof subscription.keys.auth !== 'string'
    ) {
      return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 })
    }

    let owner: string | null = null
    let customer: string | null = null
    if (targetType === 'owner') {
      const session = await getSession()
      if (session.role !== 'owner' && session.role !== 'admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
      owner = session.ownerId || (typeof targetId === 'string' ? targetId : null)
      if (!owner) {
        return NextResponse.json({ error: 'ownerId requerido' }, { status: 400 })
      }
    } else if (targetType === 'customer') {
      if (typeof targetId !== 'string' || !/^[a-zA-Z0-9-]{20,64}$/.test(targetId)) {
        return NextResponse.json({ error: 'customerHash inválido' }, { status: 400 })
      }
      customer = targetId
    } else {
      return NextResponse.json({ error: 'targetType inválido' }, { status: 400 })
    }

    const endpoint =
      typeof subscription.endpoint === 'string' ? subscription.endpoint.slice(0, 500) : ''
    const p256dh = subscription.keys.p256dh.slice(0, 200)
    const auth = subscription.keys.auth.slice(0, 200)
    const userAgent = (req.headers.get('user-agent') || '').slice(0, 250)
    const target = owner || customer!

    await db.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh,
        auth,
        targetType: owner ? 'owner' : 'customer',
        targetId: target,
        businessId: typeof businessId === 'string' ? businessId : null,
        userAgent,
      },
      update: {
        p256dh,
        auth,
        targetType: owner ? 'owner' : 'customer',
        targetId: target,
        businessId: typeof businessId === 'string' ? businessId : null,
        userAgent,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}
