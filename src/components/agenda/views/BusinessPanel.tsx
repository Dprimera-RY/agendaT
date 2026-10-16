'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Calendar as CalendarIcon,
  Clock,
  Settings,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Phone,
  MessageCircle,
  DollarSign,
  Star,
  Image as ImageIcon,
  Save,
  ChevronDown,
} from 'lucide-react'
import { useRouterStore } from '@/lib/stores/router-store'
import { useAuth } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

interface Business {
  id: string
  slug: string
  name: string
  description?: string
  logo?: string | null
  photo1?: string | null
  photo2?: string | null
  photo3?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  categoryId: string
  ownerId: string
  category: { id: string; name: string; slug: string; icon: string }
  license?: { id: string; startDate: string; endDate: string; durationDays: number; active: boolean } | null
}

interface Service {
  id: string
  name: string
  description?: string
  price: number
  durationMin: number
  active: boolean
}

interface Appointment {
  id: string
  businessId: string
  serviceId: string
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  date: string
  status: string
  notes?: string | null
  depositPaid: boolean
  depositAmount?: number | null
  service?: Service
}

interface Availability {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  active: boolean
}

export function BusinessPanel({ slug }: { slug: string }) {
  const { navigate } = useRouterStore()
  const { session } = useAuth()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)

  // Tab calendario
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week')

  // Tab servicios
  const [services, setServices] = useState<Service[]>([])

  // Tab disponibilidad
  const [availabilities, setAvailabilities] = useState<Availability[]>([])

  // Tab edición
  const [editForm, setEditForm] = useState<Partial<Business>>({})

  const loadBusiness = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/businesses/by-slug?slug=${encodeURIComponent(slug)}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setBusiness(data)
      setEditForm({
        name: data.name,
        description: data.description,
        logo: data.logo,
        photo1: data.photo1,
        photo2: data.photo2,
        photo3: data.photo3,
        address: data.address,
        phone: data.phone,
        email: data.email,
      })
    } catch {
      toast.error('Negocio no encontrado')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }, [slug, navigate])

  // Verificar acceso
  useEffect(() => {
    if (!session.role) {
      navigate('/login')
      return
    }
    loadBusiness()
  }, [session.role, navigate, loadBusiness])

  useEffect(() => {
    if (!business) return
    // Cargar servicios y disponibilidad
    fetch(`/api/owner/services?businessId=${business.id}`)
      .then((r) => r.json())
      .then(setServices)
      .catch(() => toast.error('Error al cargar servicios'))
    fetch(`/api/owner/availability?businessId=${business.id}`)
      .then((r) => r.json())
      .then(setAvailabilities)
      .catch(() => toast.error('Error al cargar disponibilidad'))
  }, [business])

  // Verificar permiso (admin o dueño del negocio)
  useEffect(() => {
    if (business && session.role === 'owner') {
      const myBiz = session.businesses?.find((b) => b.slug === slug)
      if (!myBiz) {
        toast.error('No tienes acceso a este negocio')
        navigate('/')
      }
    }
  }, [business, session, slug, navigate])

  // Cargar citas del mes actual
  const loadAppointments = useCallback(async () => {
    if (!business) return
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59)
    const params = new URLSearchParams({
      businessId: business.id,
      from: startOfMonth.toISOString(),
      to: endOfMonth.toISOString(),
    })
    const res = await fetch(`/api/appointments?${params}`)
    const data = await res.json()
    setAppointments(data)
  }, [business, currentDate])

  useEffect(() => {
    if (business) loadAppointments()
  }, [business, loadAppointments])

  // ============ ACCIONES ============
  const handleUpdateAppointment = async (id: string, updates: any) => {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Cita actualizada')
      if (data.customerNotification) {
        toast.success('WhatsApp enviado al cliente', {
          description: `A ${data.customerNotification.to}`,
        })
      }
      await loadAppointments()
      setSelectedAppt(null)
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  const handleSaveBusiness = async () => {
    if (!business) return
    try {
      const res = await fetch('/api/owner/business', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, ...editForm }),
      })
      if (!res.ok) throw new Error()
      toast.success('Cambios guardados')
      await loadBusiness()
    } catch {
      toast.error('Error al guardar')
    }
  }

  const handleSaveAvailability = async (dow: number, startTime: string, endTime: string, active: boolean) => {
    if (!business) return
    try {
      const res = await fetch('/api/owner/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          dayOfWeek: dow,
          startTime,
          endTime,
          active,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Disponibilidad actualizada')
      const refreshed = await fetch(`/api/owner/availability?businessId=${business.id}`).then((r) => r.json())
      setAvailabilities(refreshed)
    } catch {
      toast.error('Error al guardar')
    }
  }

  // Stats
  const stats = useMemo(() => {
    const now = new Date()
    const monthAppts = appointments.filter(
      (a) => new Date(a.date).getMonth() === now.getMonth()
    )
    return {
      total: appointments.length,
      pendientes: monthAppts.filter((a) => a.status === 'pendiente').length,
      confirmadas: monthAppts.filter((a) => a.status === 'confirmada').length,
      completadas: monthAppts.filter((a) => a.status === 'completada').length,
      ingresos: monthAppts
        .filter((a) => a.status === 'completada' || a.status === 'confirmada')
        .reduce((sum, a) => sum + (a.service?.price || 0), 0),
    }
  }, [appointments])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  if (!business) return null

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
            {business.logo ? (
              <img src={business.logo} alt={business.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-primary">{business.name[0]}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{business.name}</h1>
            <p className="text-sm text-muted-foreground">/negocio/{business.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/negocio/${business.slug}`)}>
            Ver página pública
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Citas este mes</div>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Pendientes</div>
            <div className="text-3xl font-bold text-amber-600">{stats.pendientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Confirmadas</div>
            <div className="text-3xl font-bold text-green-600">{stats.confirmadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Ingresos proyectados</div>
            <div className="text-3xl font-bold text-primary">${stats.ingresos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Estado de licencia */}
      {business.license && (
        <Card className={`border-l-4 ${business.license.active && new Date(business.license.endDate) > new Date() ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm font-medium">
                Licencia: {business.license.active ? 'Activa' : 'Inactiva'}
              </div>
              <div className="text-xs text-muted-foreground">
                Vence: {new Date(business.license.endDate).toLocaleDateString('es-ES')}
                {' · '}
                Días restantes: {Math.max(0, Math.ceil((new Date(business.license.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
              </div>
            </div>
            <Badge variant={business.license.active ? 'default' : 'destructive'}>
              {business.license.active ? 'ACTIVA' : 'EXPIRADA'}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Tabs principales */}
      <Tabs defaultValue="calendar">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="calendar">
            <CalendarIcon className="h-4 w-4 mr-1" />Calendario
          </TabsTrigger>
          <TabsTrigger value="services">
            <Scissors className="h-4 w-4 mr-1" />Servicios
          </TabsTrigger>
          <TabsTrigger value="availability">
            <Clock className="h-4 w-4 mr-1" />Disponibilidad
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-1" />Ajustes
          </TabsTrigger>
        </TabsList>

        {/* CALENDARIO */}
        <TabsContent value="calendar" className="space-y-3">
          <CalendarHeader
            currentDate={currentDate}
            onChange={setCurrentDate}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
          {viewMode === 'month' && (
            <MonthView
              date={currentDate}
              appointments={appointments}
              onSlotClick={setSelectedAppt}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              date={currentDate}
              appointments={appointments}
              onSlotClick={setSelectedAppt}
            />
          )}
          {viewMode === 'day' && (
            <DayView
              date={currentDate}
              appointments={appointments}
              onSlotClick={setSelectedAppt}
            />
          )}
        </TabsContent>

        {/* SERVICIOS */}
        <TabsContent value="services">
          <ServicesTab businessId={business.id} services={services} onChange={setServices} />
        </TabsContent>

        {/* DISPONIBILIDAD */}
        <TabsContent value="availability">
          <AvailabilityTab
            availabilities={availabilities}
            onSave={handleSaveAvailability}
          />
        </TabsContent>

        {/* AJUSTES */}
        <TabsContent value="settings">
          <SettingsTab
            form={editForm}
            onChange={setEditForm}
            onSave={handleSaveBusiness}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog de detalle de cita */}
      <Dialog open={!!selectedAppt} onOpenChange={(o) => !o && setSelectedAppt(null)}>
        <DialogContent className="max-w-md">
          {selectedAppt && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Detalle de cita
                </DialogTitle>
                <DialogDescription>
                  {new Date(selectedAppt.date).toLocaleString('es-ES', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Cliente:</span><br /><strong>{selectedAppt.customerName}</strong></div>
                  <div><span className="text-muted-foreground">Teléfono:</span><br /><strong>{selectedAppt.customerPhone}</strong></div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Servicio:</span><br />
                    <strong>{selectedAppt.service?.name}</strong>
                    <span className="ml-2 text-primary font-bold">${selectedAppt.service?.price}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Estado:</span>{' '}
                    <StatusBadge status={selectedAppt.status} />
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Depósito:</span>{' '}
                    {selectedAppt.depositPaid ? (
                      <Badge variant="default" className="bg-green-600">Pagado ${selectedAppt.depositAmount || ''}</Badge>
                    ) : (
                      <Badge variant="secondary">Pendiente</Badge>
                    )}
                  </div>
                </div>

                {selectedAppt.notes && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Notas / WhatsApp:</div>
                    <pre className="whitespace-pre-wrap text-xs font-mono">{selectedAppt.notes}</pre>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.open(`https://wa.me/${selectedAppt.customerPhone.replace(/[^0-9]/g, '')}`, '_blank')
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />WhatsApp cliente
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.open(`tel:${selectedAppt.customerPhone}`)
                    }}
                  >
                    <Phone className="h-4 w-4 mr-1" />Llamar
                  </Button>
                </div>
              </div>
              <DialogFooter className="flex-wrap gap-2">
                {selectedAppt.status === 'pendiente' && !selectedAppt.depositPaid && (
                  <Button
                    onClick={() => handleUpdateAppointment(selectedAppt.id, {
                      depositPaid: true,
                      depositAmount: selectedAppt.service?.price,
                    })}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />Confirmar depósito
                  </Button>
                )}
                {selectedAppt.status !== 'completada' && selectedAppt.status !== 'cancelada' && (
                  <Button
                    variant="secondary"
                    onClick={() => handleUpdateAppointment(selectedAppt.id, { status: 'completada' })}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />Marcar completada
                  </Button>
                )}
                {selectedAppt.status !== 'cancelada' && (
                  <Button
                    variant="destructive"
                    onClick={() => handleUpdateAppointment(selectedAppt.id, { status: 'cancelada' })}
                  >
                    <XCircle className="h-4 w-4 mr-1" />Cancelar
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: any; label: string }> = {
    pendiente: { variant: 'secondary', label: '⏳ Pendiente' },
    confirmada: { variant: 'default', label: '✓ Confirmada' },
    completada: { variant: 'default', label: '✓ Completada' },
    cancelada: { variant: 'destructive', label: '✗ Cancelada' },
  }
  const s = map[status] || { variant: 'outline', label: status }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

function CalendarHeader({
  currentDate,
  onChange,
  viewMode,
  onViewModeChange,
}: {
  currentDate: Date
  onChange: (d: Date) => void
  viewMode: 'month' | 'week' | 'day'
  onViewModeChange: (m: 'month' | 'week' | 'day') => void
}) {
  const label = useMemo(() => {
    if (viewMode === 'month') return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    if (viewMode === 'day') return currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    const start = new Date(currentDate)
    start.setDate(currentDate.getDate() - currentDate.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return `${start.getDate()} ${MONTHS[start.getMonth()]} - ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`
  }, [currentDate, viewMode])

  const change = (delta: number) => {
    const d = new Date(currentDate)
    if (viewMode === 'month') d.setMonth(d.getMonth() + delta)
    else if (viewMode === 'week') d.setDate(d.getDate() + delta * 7)
    else d.setDate(d.getDate() + delta)
    onChange(d)
  }

  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => change(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => change(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold capitalize ml-2">{label}</h2>
        <Button variant="ghost" size="sm" onClick={() => onChange(new Date())}>
          Hoy
        </Button>
      </div>
      <div className="flex bg-muted rounded-lg p-1">
        {(['day', 'week', 'month'] as const).map((m) => (
          <button
            key={m}
            onClick={() => onViewModeChange(m)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              viewMode === m ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
            }`}
          >
            {m === 'day' ? 'Día' : m === 'week' ? 'Semana' : 'Mes'}
          </button>
        ))}
      </div>
    </div>
  )
}

function MonthView({
  date,
  appointments,
  onSlotClick,
}: {
  date: Date
  appointments: Appointment[]
  onSlotClick: (a: Appointment) => void
}) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const cells: Array<{ day: number | null; date?: Date }> = []
  for (let i = 0; i < startDayOfWeek; i++) cells.push({ day: null })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: new Date(date.getFullYear(), date.getMonth(), d) })
  }

  const apptsForDay = (d?: Date) => {
    if (!d) return []
    return appointments.filter((a) => new Date(a.date).toDateString() === d.toDateString())
  }

  return (
    <Card>
      <CardContent className="p-2 sm:p-4">
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
          {cells.map((cell, i) => {
            const dayAppts = apptsForDay(cell.date)
            const isToday = cell.date && cell.date.toDateString() === today.toDateString()
            return (
              <div
                key={i}
                className={`min-h-20 sm:min-h-28 border rounded-md p-1 ${
                  cell.day
                    ? isToday
                      ? 'bg-primary/5 border-primary/30'
                      : 'border-border'
                    : 'border-transparent'
                }`}
              >
                {cell.day && (
                  <>
                    <div className="text-xs font-medium mb-1">{cell.day}</div>
                    <div className="space-y-1">
                      {dayAppts.slice(0, 3).map((a) => (
                        <button
                          key={a.id}
                          onClick={() => onSlotClick(a)}
                          className="w-full text-left text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground truncate transition-colors"
                          title={`${a.customerName} - ${a.service?.name}`}
                        >
                          {new Date(a.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} {a.customerName.split(' ')[0]}
                        </button>
                      ))}
                      {dayAppts.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">+{dayAppts.length - 3} más</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function WeekView({
  date,
  appointments,
  onSlotClick,
}: {
  date: Date
  appointments: Appointment[]
  onSlotClick: (a: Appointment) => void
}) {
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay())
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
  const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8am-7pm

  const apptAt = (d: Date, h: number) => {
    return appointments.find((a) => {
      const ad = new Date(a.date)
      return ad.toDateString() === d.toDateString() && ad.getHours() === h
    })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <Card>
      <CardContent className="p-2 sm:p-4 overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-8 gap-1 mb-1">
            <div></div>
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString()
              return (
                <div
                  key={i}
                  className={`text-center text-xs font-medium py-2 rounded ${
                    isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <div>{DAYS[d.getDay()]}</div>
                  <div className="text-base font-bold">{d.getDate()}</div>
                </div>
              )
            })}
          </div>
          {hours.map((h) => (
            <div key={h} className="grid grid-cols-8 gap-1 mb-1">
              <div className="text-xs text-muted-foreground text-right pr-2 py-2">
                {h}:00
              </div>
              {weekDays.map((d, di) => {
                const appt = apptAt(d, h)
                return (
                  <div
                    key={di}
                    className={`min-h-12 border border-border rounded text-xs p-1 ${
                      appt ? 'cursor-pointer' : ''
                    } ${appt?.status === 'pendiente' ? 'bg-amber-50 border-amber-200' : appt?.status === 'confirmada' ? 'bg-green-50 border-green-200' : appt?.status === 'completada' ? 'bg-primary/10 border-primary/30' : appt?.status === 'cancelada' ? 'bg-red-50 border-red-200' : ''}`}
                    onClick={() => appt && onSlotClick(appt)}
                  >
                    {appt && (
                      <div className="truncate">
                        <div className="font-medium truncate">{appt.customerName}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {appt.service?.name}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function DayView({
  date,
  appointments,
  onSlotClick,
}: {
  date: Date
  appointments: Appointment[]
  onSlotClick: (a: Appointment) => void
}) {
  const dayAppts = appointments
    .filter((a) => new Date(a.date).toDateString() === date.toDateString())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <Card>
      <CardContent className="p-4">
        {dayAppts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No hay citas programadas para este día.
          </div>
        ) : (
          <div className="space-y-2">
            {dayAppts.map((a) => (
              <button
                key={a.id}
                onClick={() => onSlotClick(a)}
                className="w-full text-left p-3 rounded-lg border hover:shadow-md transition-shadow bg-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-primary">
                      {new Date(a.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div>
                      <div className="font-medium">{a.customerName}</div>
                      <div className="text-sm text-muted-foreground">{a.service?.name} · ${a.service?.price}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.depositPaid ? (
                      <Badge className="bg-green-600">Depósito ✓</Badge>
                    ) : (
                      <Badge variant="secondary">Sin depósito</Badge>
                    )}
                    <StatusBadge status={a.status} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ServicesTab({
  businessId,
  services,
  onChange,
}: {
  businessId: string
  services: Service[]
  onChange: (s: Service[]) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', durationMin: '30' })

  const create = async () => {
    if (!form.name || !form.price) {
      toast.error('Nombre y precio son obligatorios')
      return
    }
    try {
      const res = await fetch('/api/owner/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          name: form.name,
          description: form.description,
          price: Number(form.price),
          durationMin: Number(form.durationMin),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onChange([...services, data])
      setForm({ name: '', description: '', price: '', durationMin: '30' })
      setShowForm(false)
      toast.success('Servicio creado')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const toggle = async (s: Service) => {
    try {
      const res = await fetch('/api/owner/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, active: !s.active }),
      })
      if (!res.ok) throw new Error()
      onChange(services.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)))
    } catch {
      toast.error('Error')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este servicio?')) return
    try {
      await fetch(`/api/owner/services?id=${id}`, { method: 'DELETE' })
      onChange(services.filter((x) => x.id !== id))
      toast.success('Servicio eliminado')
    } catch {
      toast.error('Error')
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Carta de servicios</CardTitle>
          <CardDescription>{services.length} servicio(s) registrado(s)</CardDescription>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />Nuevo
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nombre *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Corte de cabello" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Precio *</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="25" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descripción</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duración (minutos)</Label>
              <Input type="number" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={create}>Crear</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aún no tienes servicios. Crea tu primer servicio para empezar a recibir citas.
          </p>
        ) : (
          <div className="space-y-2">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    {!s.active && <Badge variant="secondary">Inactivo</Badge>}
                  </div>
                  {s.description && (
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {s.durationMin} min · ${s.price}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={s.active} onCheckedChange={() => toggle(s)} />
                  <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AvailabilityTab({
  availabilities,
  onSave,
}: {
  availabilities: Availability[]
  onSave: (dow: number, start: string, end: string, active: boolean) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Horarios de atención</CardTitle>
        <CardDescription>
          Define qué días y horas estás disponible para recibir citas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {DAYS_FULL.map((dayName, dow) => {
          const avail = availabilities.find((a) => a.dayOfWeek === dow)
          const [start, end] = avail ? [avail.startTime, avail.endTime] : ['09:00', '18:00']
          const active = avail?.active ?? false
          return (
            <AvailabilityRow
              key={`${dow}-${start}-${end}-${active}`}
              dayName={dayName}
              start={start}
              end={end}
              active={active}
              onSave={(s, e, a) => onSave(dow, s, e, a)}
            />
          )
        })}
      </CardContent>
    </Card>
  )
}

function AvailabilityRow({
  dayName,
  start,
  end,
  active,
  onSave,
}: {
  dayName: string
  start: string
  end: string
  active: boolean
  onSave: (s: string, e: string, a: boolean) => void
}) {
  const [localStart, setLocalStart] = useState(start)
  const [localEnd, setLocalEnd] = useState(end)
  const [localActive, setLocalActive] = useState(active)

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg flex-wrap">
      <div className="w-28 font-medium">{dayName}</div>
      <Switch checked={localActive} onCheckedChange={setLocalActive} />
      <div className="flex items-center gap-1">
        <Input
          type="time"
          value={localStart}
          onChange={(e) => setLocalStart(e.target.value)}
          disabled={!localActive}
          className="w-32"
        />
        <span className="text-muted-foreground">-</span>
        <Input
          type="time"
          value={localEnd}
          onChange={(e) => setLocalEnd(e.target.value)}
          disabled={!localActive}
          className="w-32"
        />
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onSave(localStart, localEnd, localActive)}
      >
        <Save className="h-4 w-4 mr-1" />Guardar
      </Button>
    </div>
  )
}

function SettingsTab({
  form,
  onChange,
  onSave,
}: {
  form: Partial<Business>
  onChange: (f: Partial<Business>) => void
  onSave: () => void
}) {
  const set = (key: keyof Business, value: any) => onChange({ ...form, [key]: value })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar negocio</CardTitle>
        <CardDescription>
          Actualiza los datos visibles en tu página pública
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} rows={3} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Dirección</Label>
            <Input value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />Imágenes (URL o base64)
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Logotipo</Label>
              <Input value={form.logo || ''} onChange={(e) => set('logo', e.target.value)} placeholder="https://..." />
              {form.logo && (
                <img src={form.logo} alt="Logo" className="h-20 w-20 object-cover rounded-lg border" />
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Foto de trabajo 1</Label>
              <Input value={form.photo1 || ''} onChange={(e) => set('photo1', e.target.value)} />
              {form.photo1 && <img src={form.photo1} alt="Foto 1" className="h-20 w-20 object-cover rounded-lg border" />}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Foto de trabajo 2</Label>
              <Input value={form.photo2 || ''} onChange={(e) => set('photo2', e.target.value)} />
              {form.photo2 && <img src={form.photo2} alt="Foto 2" className="h-20 w-20 object-cover rounded-lg border" />}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Foto de trabajo 3</Label>
              <Input value={form.photo3 || ''} onChange={(e) => set('photo3', e.target.value)} />
              {form.photo3 && <img src={form.photo3} alt="Foto 3" className="h-20 w-20 object-cover rounded-lg border" />}
            </div>
          </div>
        </div>

        <Button onClick={onSave} className="w-full">
          <Save className="h-4 w-4 mr-2" />Guardar cambios
        </Button>
      </CardContent>
    </Card>
  )
}
