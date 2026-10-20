'use client'

import { useEffect, useState } from 'react'
import {
  CalendarCheck,
  ClipboardCopy,
  ExternalLink,
  KeyRound,
  MapPin,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react'
import { useRouterStore } from '@/lib/stores/router-store'
import { getGuestHash, setGuestHash, isValidGuestHash } from '@/lib/guest'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PushEnableButton } from '@/components/agenda/PushRegistrar'
import { toast } from 'sonner'

interface MyAppointment {
  id: string
  date: string
  status: string // pendiente | confirmada | cancelada | completada
  notes?: string | null
  service: { name: string; price: number; currency?: string; durationMin: number }
  business: { id: string; name: string; slug: string; address?: string | null; phone?: string | null }
}

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendiente: { label: 'Pendiente', variant: 'secondary' },
  confirmada: { label: 'Confirmada', variant: 'default' },
  completada: { label: 'Completada', variant: 'outline' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
}

async function fetchAppointmentsByHash(h: string): Promise<MyAppointment[]> {
  const res = await fetch(`/api/appointments?customerHash=${encodeURIComponent(h)}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export function MisCitasView() {
  const { navigate } = useRouterStore()
  const [hash, setHash] = useState('')
  const [appointments, setAppointments] = useState<MyAppointment[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [recoveryCode, setRecoveryCode] = useState('')
  const [cancelling, setCancelling] = useState('')

  useEffect(() => {
    // setTimeout: evita setState síncrono en el cuerpo del effect
    const t = setTimeout(() => {
      const h = getGuestHash()
      setHash(h)
      if (!h) {
        setLoading(false)
        return
      }
      fetchAppointmentsByHash(h)
        .then((data) => setAppointments(data))
        .catch(() => toast.error('Error al cargar tus citas'))
        .finally(() => setLoading(false))
    }, 0)
    return () => clearTimeout(t)
  }, [])

  const loadAppointments = (h: string) => {
    setLoading(true)
    fetchAppointmentsByHash(h)
      .then((data) => setAppointments(data))
      .catch(() => toast.error('Error al cargar tus citas'))
      .finally(() => setLoading(false))
  }

  const handleRecover = () => {
    const code = recoveryCode.trim()
    if (!isValidGuestHash(code)) {
      toast.error('Código inválido')
      return
    }
    setGuestHash(code)
    setHash(code)
    setRecoveryCode('')
    loadAppointments(code)
    toast.success('Código recuperado')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hash)
      toast.success('Código copiado al portapapeles')
    } catch {
      toast.error('No se pudo copiar. Selecciona y copia el código manualmente.')
    }
  }

  const handleCancel = async (appt: MyAppointment) => {
    if (!confirm(`¿Cancelar tu cita de "${appt.service.name}" el ${new Date(appt.date).toLocaleDateString('es-ES')}?`)) return
    setCancelling(appt.id)
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerHash: hash, status: 'cancelada' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setAppointments((prev) =>
        prev?.map((a) => (a.id === appt.id ? { ...a, status: 'cancelada' } : a)) || null
      )
      toast.success('Cita cancelada', {
        description: data.ownerWhatsappLink
          ? '¿Avisar también al negocio por WhatsApp?'
          : undefined,
        action: data.ownerWhatsappLink
          ? {
              label: 'WhatsApp',
              onClick: () => window.open(data.ownerWhatsappLink, '_blank'),
            }
          : undefined,
      })
    } catch (e: any) {
      toast.error(e.message || 'Error al cancelar')
    } finally {
      setCancelling('')
    }
  }

  // Reactivar una cita cancelada (vuelve a pendiente si el horario sigue libre)
  const handleReactivate = async (appt: MyAppointment) => {
    setCancelling(appt.id)
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerHash: hash, status: 'pendiente' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setAppointments((prev) =>
        prev?.map((a) => (a.id === appt.id ? { ...a, status: 'pendiente' } : a)) || null
      )
      toast.success('Cita reactivada', {
        description: 'El negocio la revisará de nuevo.',
      })
    } catch (e: any) {
      toast.error(e.message || 'No se pudo reactivar')
    } finally {
      setCancelling('')
    }
  }

  const hasAppointments = appointments && appointments.length > 0

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis citas</h1>
        <p className="text-muted-foreground mt-1">
          Consulta y cancela las citas que agendaste con tu código de seguimiento.
        </p>
      </div>

      {/* Listado */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : !hasAppointments ? (
        <div className="rounded-xl border border-dashed p-10 text-center space-y-3">
          <CalendarCheck className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-medium">No tienes citas agendadas</p>
            <p className="text-sm text-muted-foreground">
              Explora el catálogo y agenda tu primera cita.
            </p>
          </div>
          <Button onClick={() => navigate('/')}>Explorar negocios</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments!.map((a) => {
            const status = STATUS_LABEL[a.status] || { label: a.status, variant: 'outline' as const }
            const isPast = new Date(a.date) < new Date()
            const cancellable = ['pendiente', 'confirmada'].includes(a.status)
            const reactivatable = a.status === 'cancelada' && !isPast
            return (
              <Card key={a.id} className={a.status === 'cancelada' ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => navigate(`/negocio/${a.business.slug}`)}
                          className="font-semibold hover:text-primary transition-colors inline-flex items-center gap-1"
                        >
                          {a.business.name}
                          <ExternalLink className="h-3 w-3" />
                        </button>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {isPast && a.status !== 'completada' && a.status !== 'cancelada' && (
                          <Badge variant="outline">Pasada</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {a.service.name} · {a.service.durationMin} min · ${a.service.price} {a.service.currency || 'CUP'}
                      </p>
                      <p className="text-sm font-medium">
                        {new Date(a.date).toLocaleString('es-ES', {
                          dateStyle: 'full',
                          timeStyle: 'short',
                        })}
                      </p>
                      {a.business.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {a.business.address}
                        </p>
                      )}
                    </div>
                    {cancellable && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                        disabled={cancelling === a.id}
                        onClick={() => handleCancel(a)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {cancelling === a.id ? 'Cancelando...' : 'Cancelar'}
                      </Button>
                    )}
                    {reactivatable && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-700 border-green-600/40 hover:bg-green-50 shrink-0"
                        disabled={cancelling === a.id}
                        onClick={() => handleReactivate(a)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        {cancelling === a.id ? 'Reactivando...' : 'Reactivar'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Código de seguimiento del dispositivo (debajo de las citas) */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="h-4 w-4 text-primary" />
            Tu código en este dispositivo
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-muted rounded p-2 break-all select-all">
              {hash || '—'}
            </code>
            {hash && (
              <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copiar código">
                <ClipboardCopy className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Es anónimo: no contiene tus datos. Guárdalo para ver tus citas en otro dispositivo.
          </p>
          {hash && (
            <div className="flex items-center gap-2 flex-wrap">
              <PushEnableButton target={{ targetType: 'customer', targetId: hash }} />
            </div>
          )}
          <div className="flex items-end gap-2 pt-1 border-t">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="recovery" className="text-xs">¿En otro dispositivo? Pega tu código</Label>
              <Input
                id="recovery"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="Pega aquí tu código de seguimiento"
                className="font-mono text-xs"
              />
            </div>
            <Button size="sm" onClick={handleRecover} disabled={!recoveryCode.trim()}>
              <Search className="h-4 w-4 mr-1" />
              Recuperar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
