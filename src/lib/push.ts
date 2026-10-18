// Infraestructura de notificaciones push (Web Push + VAPID).
// Las claves VAPID se generan una vez y quedan guardadas en Setting.
import webpush from 'web-push'
import { db } from '@/lib/db'

let configured = false

async function ensureVapidConfigured(): Promise<{ publicKey: string; privateKey: string } | null> {
  let pub: string | null = null
  let priv: string | null = null

  if (configured) {
    const keys = await db.setting.findMany({
      where: { key: { in: ['vapidPublicKey', 'vapidPrivateKey'] } },
    })
    pub = keys.find((k) => k.key === 'vapidPublicKey')?.value ?? null
    priv = keys.find((k) => k.key === 'vapidPrivateKey')?.value ?? null
  } else {
    pub = (await db.setting.findUnique({ where: { key: 'vapidPublicKey' } }))?.value ?? null
    priv = (await db.setting.findUnique({ where: { key: 'vapidPrivateKey' } }))?.value ?? null
    if (!pub || !priv) {
      const generated = webpush.generateVAPIDKeys()
      const newPub = generated.publicKey
      const newPriv = generated.privateKey
      await db.setting.upsert({
        where: { key: 'vapidPublicKey' },
        create: { key: 'vapidPublicKey', value: newPub },
        update: { value: newPub },
      })
      await db.setting.upsert({
        where: { key: 'vapidPrivateKey' },
        create: { key: 'vapidPrivateKey', value: newPriv },
        update: { value: newPriv },
      })
      pub = newPub
      priv = newPriv
    }
    configured = true
  }

  if (!pub || !priv) return null
  webpush.setVapidDetails('mailto:soporte@agendapro.app', pub, priv)
  return { publicKey: pub, privateKey: priv }
}

export async function getVapidPublicKey(): Promise<string | null> {
  const keys = await ensureVapidConfigured()
  return keys?.publicKey ?? null
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

async function sendToSubscription(
  sub: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<void> {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload)
    )
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode
    // Suscripciones muertas o vencidas: eliminarlas
    if (status === 404 || status === 410) {
      await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
    }
  }
}

// Enviar push a un dueño (todas sus suscripciones activas)
export async function pushToOwner(ownerId: string, payload: PushPayload): Promise<number> {
  try {
    await ensureVapidConfigured()
    const subs = await db.pushSubscription.findMany({
      where: { targetType: 'owner', targetId: ownerId },
    })
    await Promise.all(subs.map((s) => sendToSubscription(s, payload)))
    return subs.length
  } catch {
    return 0
  }
}

// Enviar push a un cliente anónimo (por su customerHash)
export async function pushToCustomer(customerHash: string, payload: PushPayload): Promise<number> {
  try {
    await ensureVapidConfigured()
    const subs = await db.pushSubscription.findMany({
      where: { targetType: 'customer', targetId: customerHash },
    })
    await Promise.all(subs.map((s) => sendToSubscription(s, payload)))
    return subs.length
  } catch {
    return 0
  }
}
