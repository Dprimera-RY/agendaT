'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// Registra el service worker de notificaciones push en el cliente
export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    let cancelled = false
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {})
      .then(() => {
        if (cancelled) return
      })
    return () => {
      cancelled = true
    }
  }, [])
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

async function getActiveSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  return reg.active ? reg : (await navigator.serviceWorker.ready)
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await getActiveSW()
  return reg ? reg.pushManager.getSubscription() : null
}

export interface PushTarget {
  targetType: 'owner' | 'customer'
  targetId: string
  businessId?: string
}

// Hook para activar/desactivar notificaciones push del dispositivo actual
export function usePushNotifications(target: PushTarget | null) {
  const [enabled, setEnabled] = useState(false)
  const [supported, setSupported] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    let cancelled = false
    // setTimeout: evita setState síncrono en el cuerpo del effect
    const t = setTimeout(() => {
      setSupported('serviceWorker' in navigator && 'PushManager' in window)
      ;(async () => {
        try {
          const sub = await currentSubscription()
          if (!cancelled) setEnabled(!!sub)
        } catch {
        } finally {
          if (!cancelled) setChecking(false)
        }
      })()
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [])

  const enable = useCallback(async () => {
    if (!target) {
      toast.error('No se pudo identificar tu cuenta para las notificaciones')
      return
    }
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Permiso de notificaciones denegado')
        return
      }
      const reg = await getActiveSW()
      if (!reg) {
        toast.error('Tu navegador no soporta notificaciones push')
        return
      }
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        const res = await fetch('/api/push/vapid-key')
        const { publicKey, error } = await res.json()
        if (!publicKey) {
          toast.error(error || 'Push no configurado en el servidor')
          return
        }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
      }
      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            endpoint: json.endpoint,
            keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
          },
          targetType: target.targetType,
          targetId: target.targetId,
          businessId: target.businessId,
        }),
      })
      setEnabled(true)
      toast.success('Notificaciones activadas en este dispositivo')
    } catch {
      toast.error('No se pudieron activar las notificaciones')
    }
  }, [target])

  const disable = useCallback(async () => {
    try {
      const sub = await currentSubscription()
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setEnabled(false)
      toast.success('Notificaciones desactivadas')
    } catch {
      toast.error('No se pudieron desactivar las notificaciones')
    }
  }, [])

  return { enabled, supported, checking, enable, disable }
}

// Botón reutilizable para activar/desactivar push
export function PushEnableButton({
  target,
  size = 'sm',
  variant = 'outline',
  className,
}: {
  target: PushTarget | null
  size?: 'sm' | 'default' | 'lg' | 'icon'
  variant?:
    | 'default'
    | 'outline'
    | 'ghost'
    | 'secondary'
    | 'destructive'
    | 'link'
  className?: string
}) {
  const { enabled, supported, enable, disable } = usePushNotifications(target)
  if (!supported || !target) return null
  return (
    <Button
      size={size}
      variant={enabled ? 'secondary' : variant}
      className={className}
      onClick={() => (enabled ? disable() : enable())}
    >
      {enabled ? (
        <>
          <BellOff className="h-4 w-4 mr-1" />Notificaciones activas
        </>
      ) : (
        <>
          <Bell className="h-4 w-4 mr-1" />Activar notificaciones
        </>
      )}
    </Button>
  )
}
