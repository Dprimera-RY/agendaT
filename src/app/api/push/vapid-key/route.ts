import { NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/push'

// Clave pública VAPID (el cliente la usa para suscribirse al service worker)
export async function GET() {
  const publicKey = await getVapidPublicKey()
  if (!publicKey) {
    return NextResponse.json({ error: 'Push no configurado' }, { status: 503 })
  }
  return NextResponse.json({ publicKey })
}
