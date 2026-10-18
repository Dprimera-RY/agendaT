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
  Pencil,
  LifeBuoy,
  KeyRound,
  BarChart3,
  RotateCcw,
  CreditCard,
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
import { CUBA_PROVINCES } from '@/lib/provinces'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { ImageField } from '@/components/agenda/ImageField'
import { PushEnableButton } from '@/components/agenda/PushRegistrar'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const DEFAULT_SERVICE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
const STATUS_COLORS: Record<string, string> = {
  pendiente: '#f59e0b',
  confirmada: '#10b981',
  completada: '#6366f1',
  cancelada: '#94a3b8',
}
const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

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
  province?: string | null
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
  color?: string | null
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
  breakStart?: string | null
  breakEnd?: string | null
  active: boolean
}

type KpiFilter = 'mes' | 'pendientes' | 'confirmadas' | 'ingresos' | null

function serviceColorOf(a: Appointment, services: Service[]): string {
  const color = a.service?.color || services.find((s) => s.id === a.serviceId)?.color
  if (color) return color
  const idx = (a.serviceId.charCodeAt(0) + a.serviceId.length) % DEFAULT_SERVICE_COLORS.length
  return DEFAULT_SERVICE_COLORS[idx]
}

function apptVisual(a: Appointment, services: Service[]) {
  const color = serviceColorOf(a, services)
  switch (a.status) {
    case 'confirmada':
      return { bg: `${color}59`, fg: '#111827', border: color, lineThrough: false }
    case 'completada':
      return { bg: `${color}8c`, fg: '#ffffff', border: color, lineThrough: false }
    case 'cancelada':
      return { bg: '#9ca3af33', fg: '#6b7280', border: '#9ca3af', lineThrough: true }
    default: // pendiente
      return { bg: `${color}33`, fg: '#111827', border: color, lineThrough: false }
  }
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function waSoporteLink(phone: string, businessName: string) {
  const digits = phone.replace(/[^0-9]/g, '')
  const text = `Hola, soy el dueño de ${businessName} y necesito ayuda con AgendaT.`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function BusinessPanel({ slug }: { slug: string }) {
  const { navigate } = useRouterStore()
  const { session, loading: authLoading } = useAuth()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)

  // Tab calendario
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week')

  // Drag & drop (reprogramar arrastrando)
  const [dragId, setDragId] = useState<string | null>(null)

  // Reprogramación manual desde el detalle
  const [showResch, setShowResch] = useState(false)
  const [reschDate, setReschDate] = useState('')
  const [reschTime, setReschTime] = useState('')

  // Modal "agendar cita" del dueño
  const [bookPrefill, setBookPrefill] = useState<{ date: string; time: string } | null>(null)
  const [bookForm, setBookForm] = useState({ customerName: '', customerPhone: '', serviceId: '', notes: '' })
  const [booking, setBooking] = useState(false)

  // Tab servicios
  const [services, setServices] = useState<Service[]>([])

  // Tab disponibilidad
  const [availabilities, setAvailabilities] = useState<Availability[]>([])

  // Tab edición
  const [editForm, setEditForm] = useState<Partial<Business>>({})

  // Soporte (teléfono configurable desde admin)
  const [supportPhone, setSupportPhone] = useState<string | null>(null)

  // KPIs clickeables: lista de citas según el card seleccionado
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>(null)

  const openAppt = useCallback((a: Appointment) => {
    setSelectedAppt(a)
    setShowResch(false)
    const d = new Date(a.date)
    setReschDate(dayKey(d))
    setReschTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
  }, [])

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
        province: data.province,
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
    if (authLoading) return
    if (!session.role) {
      navigate('/login')
      return
    }
    const t = setTimeout(() => loadBusiness(), 0)
    return () => clearTimeout(t)
  }, [session.role, authLoading, navigate, loadBusiness])

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

  // Teléfono de soporte (configurable desde el panel admin)
  useEffect(() => {
    let cancelled = false
    fetch('/api/config/support')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setSupportPhone(d.supportPhone || null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

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
    if (!business) return
    const t = setTimeout(() => loadAppointments(), 0)
    return () => clearTimeout(t)
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
      const waLinkToCustomer: string | null = data.customerNotification?.link || null
      toast.success('Cita actualizada', {
        description: waLinkToCustomer
          ? 'Avisa al cliente por WhatsApp con un clic:'
          : undefined,
        action: waLinkToCustomer
          ? {
              label: 'WhatsApp',
              onClick: () => window.open(waLinkToCustomer, '_blank'),
            }
          : undefined,
      })
      await loadAppointments()
      setSelectedAppt(null)
      setShowResch(false)
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  // Chequeo local de solapamiento (feedback visual antes del drop)
  const hasConflict = useCallback(
    (apptId: string, newDate: Date) => {
      const appt = appointments.find((a) => a.id === apptId)
      if (!appt) return false
      const durationMin = appt.service?.durationMin || 30
      const newEnd = new Date(newDate.getTime() + durationMin * 60 * 1000)
      return appointments.some((other) => {
        if (other.id === apptId) return false
        if (!['pendiente', 'confirmada'].includes(other.status)) return false
        const otherStart = new Date(other.date)
        const otherEnd = new Date(otherStart.getTime() + (other.service?.durationMin || 60) * 60 * 1000)
        return newDate < otherEnd && newEnd > otherStart
      })
    },
    [appointments]
  )

  const handleDropDay = useCallback(
    async (day: Date, hour?: number) => {
      if (!dragId) return
      const appt = appointments.find((a) => a.id === dragId)
      setDragId(null)
      if (!appt) return
      const old = new Date(appt.date)
      const newDate = new Date(day)
      newDate.setHours(hour !== undefined ? hour : old.getHours(), old.getMinutes(), 0, 0)
      if (newDate.getTime() === old.getTime()) return
      if (hasConflict(appt.id, newDate)) {
        toast.error('Esa fecha y hora chocan con otra cita')
        return
      }
      try {
        const res = await fetch(`/api/appointments/${appt.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: newDate.toISOString() }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        const waLinkToCustomer: string | null = data.customerNotification?.link || null
        toast.success('Cita reprogramada', {
          action: waLinkToCustomer
            ? {
                label: 'Avisar por WhatsApp',
                onClick: () => window.open(waLinkToCustomer, '_blank'),
              }
            : undefined,
        })
        await loadAppointments()
      } catch (e: any) {
        toast.error(e.message || 'Error al reprogramar')
      }
    },
    [dragId, appointments, hasConflict, loadAppointments]
  )

  const openBookDialog = useCallback((date: Date, hour?: number) => {
    const d = new Date(date)
    const h = hour !== undefined ? hour : 9
    setBookPrefill({ date: dayKey(d), time: `${String(h).padStart(2, '0')}:00` })
    setBookForm({ customerName: '', customerPhone: '', serviceId: '', notes: '' })
  }, [])

  const handleBookOwner = async () => {
    if (!business || !bookPrefill) return
    if (!bookForm.customerName || !bookForm.customerPhone || !bookForm.serviceId) {
      toast.error('Nombre, teléfono y servicio son obligatorios')
      return
    }
    setBooking(true)
    try {
      const dateISO = new Date(`${bookPrefill.date}T${bookPrefill.time}`).toISOString()
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          serviceId: bookForm.serviceId,
          customerName: bookForm.customerName,
          customerPhone: bookForm.customerPhone,
          date: dateISO,
          notes: bookForm.notes,
          byOwner: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Cita creada')
      setBookPrefill(null)
      await loadAppointments()
    } catch (e: any) {
      toast.error(e.message || 'Error al agendar')
    } finally {
      setBooking(false)
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

  const handleSaveAvailability = async (
    dow: number,
    startTime: string,
    endTime: string,
    active: boolean,
    breakStart?: string,
    breakEnd?: string
  ) => {
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
          breakStart: breakStart || null,
          breakEnd: breakEnd || null,
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
      monthAppts,
    }
  }, [appointments])

  // Lista de citas del KPI clickeado (dialog)
  const kpiAppts = useMemo(() => {
    const base = [...stats.monthAppts].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    switch (kpiFilter) {
      case 'mes':
        return base
      case 'pendientes':
        return base.filter((a) => a.status === 'pendiente')
      case 'confirmadas':
        return base.filter((a) => a.status === 'confirmada')
      case 'ingresos':
        return base.filter((a) => a.status === 'completada' || a.status === 'confirmada')
      default:
        return []
    }
  }, [kpiFilter, stats.monthAppts])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  if (!business) return null

  const licenseOk = business.license && business.license.active && new Date(business.license.endDate) > new Date()

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
        <div className="flex items-center gap-2 flex-wrap">
          <PushEnableButton
            target={
              session.ownerId
                ? { targetType: 'owner', targetId: session.ownerId, businessId: business.id }
                : null
            }
          />
          {supportPhone && (
            <Button variant="outline" size="sm" asChild>
              <a href={waSoporteLink(supportPhone, business.name)} target="_blank" rel="noreferrer">
                <LifeBuoy className="h-4 w-4 mr-1" />Soporte
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/negocio/${business.slug}`)}>
            Ver catálogo
          </Button>
        </div>
      </div>

      {/* Stats (clickeables: muestran la lista de citas) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setKpiFilter('mes')}
          onKeyDown={(e) => e.key === 'Enter' && setKpiFilter('mes')}
          className="cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors"
        >
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Citas este mes</div>
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Ver lista →</div>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setKpiFilter('pendientes')}
          onKeyDown={(e) => e.key === 'Enter' && setKpiFilter('pendientes')}
          className="cursor-pointer hover:border-amber-500/60 hover:bg-amber-50 transition-colors"
        >
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Pendientes</div>
            <div className="text-3xl font-bold text-amber-600">{stats.pendientes}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Ver lista →</div>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setKpiFilter('confirmadas')}
          onKeyDown={(e) => e.key === 'Enter' && setKpiFilter('confirmadas')}
          className="cursor-pointer hover:border-green-500/60 hover:bg-green-50 transition-colors"
        >
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Confirmadas</div>
            <div className="text-3xl font-bold text-green-600">{stats.confirmadas}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Ver lista →</div>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setKpiFilter('ingresos')}
          onKeyDown={(e) => e.key === 'Enter' && setKpiFilter('ingresos')}
          className="cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors"
        >
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Ingresos proyectados</div>
            <div className="text-3xl font-bold text-primary">${stats.ingresos}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Ver lista →</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="calendar">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="calendar">
            <CalendarIcon className="h-4 w-4 mr-1" />Calendario
          </TabsTrigger>
          <TabsTrigger value="services">
            <Scissors className="h-4 w-4 mr-1" />Servicios
          </TabsTrigger>
          <TabsTrigger value="availability">
            <Clock className="h-4 w-4 mr-1" />Disponibilidad
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="h-4 w-4 mr-1" />Estadísticas
          </TabsTrigger>
          <TabsTrigger value="license">
            <KeyRound className="h-4 w-4 mr-1" />Licencia
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-1" />Ajustes
          </TabsTrigger>
        </TabsList>

        {/* CALENDARIO */}
        <TabsContent value="calendar" className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CalendarHeader
              currentDate={currentDate}
              onChange={setCurrentDate}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
            <Button size="sm" onClick={() => openBookDialog(new Date())}>
              <Plus className="h-4 w-4 mr-1" />Agendar cita
            </Button>
          </div>
          {viewMode === 'month' && (
            <MonthView
              date={currentDate}
              appointments={appointments}
              services={services}
              onSlotClick={openAppt}
              onEmptySlot={openBookDialog}
              dragId={dragId}
              onDragStart={setDragId}
              onDragEnd={() => setDragId(null)}
              hasConflict={hasConflict}
              onDropDay={handleDropDay}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              date={currentDate}
              appointments={appointments}
              services={services}
              onSlotClick={openAppt}
              onEmptySlot={openBookDialog}
              dragId={dragId}
              onDragStart={setDragId}
              onDragEnd={() => setDragId(null)}
              hasConflict={hasConflict}
              onDropDay={handleDropDay}
            />
          )}
          {viewMode === 'day' && (
            <DayView
              date={currentDate}
              appointments={appointments}
              services={services}
              onSlotClick={openAppt}
              onEmptySlot={openBookDialog}
              dragId={dragId}
              onDragStart={setDragId}
              onDragEnd={() => setDragId(null)}
              hasConflict={hasConflict}
              onDropDay={handleDropDay}
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

        {/* ESTADÍSTICAS */}
        <TabsContent value="stats">
          <StatsTab businessId={business.id} />
        </TabsContent>

        {/* LICENCIA */}
        <TabsContent value="license">
          <LicenseTab license={business.license} supportPhone={supportPhone} businessId={business.id} />
        </TabsContent>

        {/* AJUSTES */}
        <TabsContent value="settings">
          <SettingsTab
            businessId={business.id}
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
                  <div className="col-span-2 flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full border"
                      style={{ background: serviceColorOf(selectedAppt, services) }}
                    />
                    <span className="text-muted-foreground">Servicio:</span>
                    <strong>{selectedAppt.service?.name}</strong>
                    <span className="ml-auto text-primary font-bold">${selectedAppt.service?.price}</span>
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

                {/* Reprogramar */}
                {!showResch && !['completada', 'cancelada'].includes(selectedAppt.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowResch(true)}
                  >
                    <CalendarIcon className="h-4 w-4 mr-1" />Reprogramar cita
                  </Button>
                )}
                {showResch && (
                  <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                    <div className="text-xs font-medium text-muted-foreground">Nueva fecha y hora</div>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={reschDate}
                        onChange={(e) => setReschDate(e.target.value)}
                      />
                      <Input
                        type="time"
                        value={reschTime}
                        onChange={(e) => setReschTime(e.target.value)}
                        className="w-32"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!reschDate || !reschTime) {
                            toast.error('Indica fecha y hora')
                            return
                          }
                          const newDate = new Date(`${reschDate}T${reschTime}`)
                          if (isNaN(newDate.getTime())) {
                            toast.error('Fecha inválida')
                            return
                          }
                          handleUpdateAppointment(selectedAppt.id, { date: newDate.toISOString() })
                        }}
                      >
                        <Save className="h-4 w-4 mr-1" />Guardar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowResch(false)}>
                        Descartar
                      </Button>
                    </div>
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
                {selectedAppt.status === 'pendiente' && (
                  <Button
                    onClick={() => handleUpdateAppointment(selectedAppt.id, { status: 'confirmada' })}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />Aceptar
                  </Button>
                )}
                {selectedAppt.status === 'pendiente' && !selectedAppt.depositPaid && (
                  <Button
                    onClick={() => handleUpdateAppointment(selectedAppt.id, {
                      depositPaid: true,
                      depositAmount: selectedAppt.service?.price,
                    })}
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
                {selectedAppt.status === 'cancelada' && (
                  <Button
                    variant="outline"
                    className="border-green-600 text-green-700 hover:bg-green-50"
                    onClick={() => handleUpdateAppointment(selectedAppt.id, { status: 'pendiente' })}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />Reactivar cita
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: lista de citas del KPI clickeado */}
      <Dialog open={kpiFilter !== null} onOpenChange={(o) => !o && setKpiFilter(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {kpiFilter === 'mes' && 'Citas de este mes'}
              {kpiFilter === 'pendientes' && 'Citas pendientes'}
              {kpiFilter === 'confirmadas' && 'Citas confirmadas'}
              {kpiFilter === 'ingresos' && 'Citas que generan ingresos'}
            </DialogTitle>
            <DialogDescription>
              {kpiAppts.length} cita(s) · {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {kpiAppts.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No hay citas en esta categoría.
              </div>
            ) : (
              kpiAppts.map((a) => {
                const v = apptVisual(a, services)
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      setKpiFilter(null)
                      openAppt(a)
                    }}
                    className="w-full text-left p-3 rounded-lg border hover:shadow-md transition-shadow"
                    style={{ background: v.bg, color: v.fg, borderColor: v.border }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-lg font-bold shrink-0">
                          {new Date(a.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}{' '}
                          {new Date(a.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="min-w-0">
                          <div className={`font-medium truncate ${v.lineThrough ? 'line-through' : ''}`}>
                            {a.customerName}
                          </div>
                          <div className="text-xs opacity-80 truncate">
                            {a.service?.name} · ${a.service?.price}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  </button>
                )
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKpiFilter(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de agendado rápido (dueño) */}
      <Dialog open={!!bookPrefill} onOpenChange={(o) => !o && setBookPrefill(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Agendar cita
            </DialogTitle>
            <DialogDescription>Registra una cita manualmente en tu calendario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha</Label>
                <Input
                  type="date"
                  value={bookPrefill?.date || ''}
                  onChange={(e) => setBookPrefill((p) => (p ? { ...p, date: e.target.value } : p))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hora</Label>
                <Input
                  type="time"
                  value={bookPrefill?.time || ''}
                  onChange={(e) => setBookPrefill((p) => (p ? { ...p, time: e.target.value } : p))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Servicio *</Label>
              <Select value={bookForm.serviceId} onValueChange={(v) => setBookForm({ ...bookForm, serviceId: v })}>
                <SelectTrigger aria-label="Servicio">
                  <SelectValue placeholder="Selecciona un servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.filter((s) => s.active).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · ${s.price} · {s.durationMin} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente *</Label>
                <Input
                  value={bookForm.customerName}
                  onChange={(e) => setBookForm({ ...bookForm, customerName: e.target.value })}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono *</Label>
                <Input
                  value={bookForm.customerPhone}
                  onChange={(e) => setBookForm({ ...bookForm, customerPhone: e.target.value })}
                  placeholder="+53 5 123 4567"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notas</Label>
              <Textarea
                value={bookForm.notes}
                onChange={(e) => setBookForm({ ...bookForm, notes: e.target.value })}
                rows={2}
                placeholder="Indicaciones especiales..."
              />
            </div>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button onClick={handleBookOwner} disabled={booking}>
              <CalendarIcon className="h-4 w-4 mr-1" />Crear cita
            </Button>
            <Button variant="ghost" onClick={() => setBookPrefill(null)}>
              Descartar
            </Button>
          </DialogFooter>
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

interface CalendarViewProps {
  date: Date
  appointments: Appointment[]
  services: Service[]
  onSlotClick: (a: Appointment) => void
  onEmptySlot: (d: Date, hour?: number) => void
  dragId: string | null
  onDragStart: (id: string) => void
  onDragEnd: () => void
  hasConflict: (apptId: string, newDate: Date) => boolean
  onDropDay: (day: Date, hour?: number) => void
}

function MonthView({
  date,
  appointments,
  services,
  onSlotClick,
  onEmptySlot,
  dragId,
  onDragStart,
  onDragEnd,
  hasConflict,
  onDropDay,
}: CalendarViewProps) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [overKey, setOverKey] = useState<string | null>(null)
  const [conflictKey, setConflictKey] = useState<string | null>(null)

  const cells: Array<{ day: number | null; date?: Date }> = []
  for (let i = 0; i < startDayOfWeek; i++) cells.push({ day: null })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: new Date(date.getFullYear(), date.getMonth(), d) })
  }

  const apptsForDay = (d?: Date) => {
    if (!d) return []
    return appointments.filter((a) => new Date(a.date).toDateString() === d.toDateString())
  }

  const handleDragOver = (e: React.DragEvent, day: Date, key: string) => {
    if (!dragId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverKey(key)
    const appt = appointments.find((a) => a.id === dragId)
    const old = appt ? new Date(appt.date) : null
    const probe = new Date(day)
    probe.setHours(old ? old.getHours() : 9, old ? old.getMinutes() : 0, 0, 0)
    setConflictKey(hasConflict(dragId, probe) ? key : null)
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
            const key = cell.date ? dayKey(cell.date) : `pad-${i}`
            const isOver = dragId && cell.date && overKey === key
            const isConflict = isOver && conflictKey === key
            return (
              <div
                key={i}
                onClick={() => cell.date && !isOver && onEmptySlot(cell.date)}
                onDragOver={(e) => cell.date && handleDragOver(e, cell.date, key)}
                onDragLeave={() => setOverKey((k) => (k === key ? null : k))}
                onDrop={(e) => {
                  if (!cell.date) return
                  e.preventDefault()
                  setOverKey(null)
                  setConflictKey(null)
                  onDropDay(cell.date)
                }}
                className={`min-h-20 sm:min-h-28 border rounded-md p-1 transition-colors ${
                  cell.day
                    ? isToday
                      ? 'bg-primary/5 border-primary/30'
                      : 'border-border'
                    : 'border-transparent'
                } ${cell.date && dragId ? 'cursor-copy' : ''} ${
                  isConflict ? 'ring-2 ring-red-500 bg-red-100' : isOver ? 'ring-2 ring-primary/60 bg-primary/10' : ''
                }`}
              >
                {cell.day && (
                  <>
                    <div className="text-xs font-medium mb-1">{cell.day}</div>
                    <div className="space-y-1">
                      {dayAppts.slice(0, 3).map((a) => {
                        const v = apptVisual(a, services)
                        return (
                          <button
                            key={a.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move'
                              onDragStart(a.id)
                            }}
                            onDragEnd={onDragEnd}
                            onClick={(e) => {
                              e.stopPropagation()
                              onSlotClick(a)
                            }}
                            className="w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate transition-colors hover:opacity-80"
                            style={{ background: v.bg, color: v.fg, borderLeft: `3px solid ${v.border}` }}
                            title={`${a.customerName} - ${a.service?.name}`}
                          >
                            <span className={v.lineThrough ? 'line-through' : ''}>
                              {new Date(a.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} {a.customerName.split(' ')[0]}
                            </span>
                          </button>
                        )
                      })}
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
  services,
  onSlotClick,
  onEmptySlot,
  dragId,
  onDragStart,
  onDragEnd,
  hasConflict,
  onDropDay,
}: CalendarViewProps) {
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay())
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
  const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8am-7pm
  const [overKey, setOverKey] = useState<string | null>(null)
  const [conflictKey, setConflictKey] = useState<string | null>(null)

  const apptAt = (d: Date, h: number) => {
    return appointments.find((a) => {
      const ad = new Date(a.date)
      return ad.toDateString() === d.toDateString() && ad.getHours() === h
    })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const handleDragOver = (e: React.DragEvent, day: Date, h: number, key: string) => {
    if (!dragId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverKey(key)
    const appt = appointments.find((a) => a.id === dragId)
    const probe = new Date(day)
    probe.setHours(h, appt ? new Date(appt.date).getMinutes() : 0, 0, 0)
    setConflictKey(hasConflict(dragId, probe) ? key : null)
  }

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
                const key = `${dayKey(d)}T${h}`
                const isOver = dragId && overKey === key
                const isConflict = isOver && conflictKey === key
                return (
                  <div
                    key={di}
                    onClick={() => !appt && !isOver && onEmptySlot(d, h)}
                    onDragOver={(e) => handleDragOver(e, d, h, key)}
                    onDragLeave={() => setOverKey((k) => (k === key ? null : k))}
                    onDrop={(e) => {
                      e.preventDefault()
                      setOverKey(null)
                      setConflictKey(null)
                      onDropDay(d, h)
                    }}
                    className={`min-h-12 border border-border rounded text-xs p-1 transition-colors ${
                      appt ? 'cursor-pointer' : ''
                    } ${!appt && dragId ? 'cursor-copy' : ''} ${
                      isConflict
                        ? 'ring-2 ring-red-500 bg-red-100'
                        : isOver
                          ? 'ring-2 ring-primary/60 bg-primary/10'
                          : ''
                    }`}
                  >
                    {appt && (
                      (() => {
                        const v = apptVisual(appt, services)
                        return (
                          <div
                            className="h-full truncate rounded p-0.5"
                            style={{ background: v.bg, color: v.fg, borderLeft: `3px solid ${v.border}` }}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move'
                              onDragStart(appt.id)
                            }}
                            onDragEnd={onDragEnd}
                            onClick={(e) => {
                              e.stopPropagation()
                              onSlotClick(appt)
                            }}
                          >
                            <div className={`font-medium truncate ${v.lineThrough ? 'line-through' : ''}`}>
                              {appt.customerName}
                            </div>
                            <div className="text-[10px] opacity-80 truncate">
                              {appt.service?.name}
                            </div>
                          </div>
                        )
                      })()
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
  services,
  onSlotClick,
  onEmptySlot,
  dragId,
  onDragStart,
  onDragEnd,
  hasConflict,
  onDropDay,
}: CalendarViewProps) {
  const dayAppts = appointments
    .filter((a) => new Date(a.date).toDateString() === date.toDateString())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const [over, setOver] = useState(false)
  const [conflict, setConflict] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => onEmptySlot(date)}>
          <Plus className="h-4 w-4 mr-1" />Agendar en este día
        </Button>
      </div>
      <Card
        onDragOver={(e) => {
          if (!dragId) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          setOver(true)
          const appt = appointments.find((a) => a.id === dragId)
          const probe = new Date(date)
          probe.setHours(appt ? new Date(appt.date).getHours() : 9, appt ? new Date(appt.date).getMinutes() : 0, 0, 0)
          setConflict(hasConflict(dragId, probe))
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          setConflict(false)
          onDropDay(date)
        }}
        className={`${over ? (conflict ? 'ring-2 ring-red-500 bg-red-100' : 'ring-2 ring-primary/60 bg-primary/10') : ''} transition-colors`}
      >
        <CardContent className="p-4">
          {dayAppts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No hay citas programadas para este día. Haz clic en un hueco vacío para agendar.
            </div>
          ) : (
            <div className="space-y-2">
              {dayAppts.map((a) => {
                const v = apptVisual(a, services)
                return (
                  <button
                    key={a.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      onDragStart(a.id)
                    }}
                    onDragEnd={onDragEnd}
                    onClick={() => onSlotClick(a)}
                    className="w-full text-left p-3 rounded-lg border hover:shadow-md transition-shadow"
                    style={{ background: v.bg, color: v.fg, borderColor: v.border }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold" style={{ color: v.fg }}>
                          {new Date(a.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div>
                          <div className={`font-medium ${v.lineThrough ? 'line-through' : ''}`}>{a.customerName}</div>
                          <div className="text-sm opacity-80">{a.service?.name} · ${a.service?.price}</div>
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
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
  const [form, setForm] = useState({ name: '', description: '', price: '', durationMin: '30', color: DEFAULT_SERVICE_COLORS[0] })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edit, setEdit] = useState({ name: '', description: '', price: '', durationMin: '30', color: DEFAULT_SERVICE_COLORS[0] })

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
          color: form.color,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onChange([...services, data])
      setForm({ name: '', description: '', price: '', durationMin: '30', color: DEFAULT_SERVICE_COLORS[0] })
      setShowForm(false)
      toast.success('Servicio creado')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const startEdit = (s: Service) => {
    setEditingId(s.id)
    setEdit({
      name: s.name,
      description: s.description || '',
      price: String(s.price),
      durationMin: String(s.durationMin),
      color: s.color || DEFAULT_SERVICE_COLORS[0],
    })
  }

  const saveEdit = async (id: string) => {
    if (!edit.name || !edit.price) {
      toast.error('Nombre y precio son obligatorios')
      return
    }
    try {
      const res = await fetch('/api/owner/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: edit.name,
          description: edit.description,
          price: Number(edit.price),
          durationMin: Number(edit.durationMin),
          color: edit.color,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onChange(services.map((x) => (x.id === id ? data : x)))
      setEditingId(null)
      toast.success('Servicio actualizado')
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Duración (minutos)</Label>
                <Input type="number" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Color en el calendario</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-9 w-14 cursor-pointer rounded border bg-transparent p-0.5"
                    aria-label="Color del servicio"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{form.color}</span>
                </div>
              </div>
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
            {services.map((s) =>
              editingId === s.id ? (
                <div key={s.id} className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre *</Label>
                      <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Precio *</Label>
                      <Input type="number" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Descripción</Label>
                    <Textarea value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} rows={2} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Duración (minutos)</Label>
                      <Input type="number" value={edit.durationMin} onChange={(e) => setEdit({ ...edit, durationMin: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Color en el calendario</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={edit.color}
                          onChange={(e) => setEdit({ ...edit, color: e.target.value })}
                          className="h-9 w-14 cursor-pointer rounded border bg-transparent p-0.5"
                          aria-label="Color del servicio"
                        />
                        <span className="text-xs font-mono text-muted-foreground">{edit.color}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(s.id)}>
                      <Save className="h-4 w-4 mr-1" />Guardar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div key={s.id} className="flex items-center justify-between gap-2 p-3 border rounded-lg">
                  <div className="flex-1 flex items-start gap-3">
                    <span
                      className="mt-1 h-4 w-4 shrink-0 rounded-full border"
                      style={{ background: s.color || '#94a3b8' }}
                      aria-hidden
                    />
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
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(s)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Switch checked={s.active} onCheckedChange={() => toggle(s)} />
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )
            )}
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
  onSave: (
    dow: number,
    start: string,
    end: string,
    active: boolean,
    breakStart?: string,
    breakEnd?: string
  ) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Horarios de atención</CardTitle>
        <CardDescription>
          Define qué días y horas estás disponible para recibir citas. El almuerzo es opcional.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {DAYS_FULL.map((dayName, dow) => {
          const avail = availabilities.find((a) => a.dayOfWeek === dow)
          const [start, end] = avail ? [avail.startTime, avail.endTime] : ['09:00', '18:00']
          const active = avail?.active ?? false
          return (
            <AvailabilityRow
              key={`${dow}-${start}-${end}-${active}-${avail?.breakStart || ''}-${avail?.breakEnd || ''}`}
              dayName={dayName}
              start={start}
              end={end}
              active={active}
              breakStart={avail?.breakStart || ''}
              breakEnd={avail?.breakEnd || ''}
              onSave={(s, e, a, bs, be) => onSave(dow, s, e, a, bs, be)}
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
  breakStart,
  breakEnd,
  onSave,
}: {
  dayName: string
  start: string
  end: string
  active: boolean
  breakStart: string
  breakEnd: string
  onSave: (s: string, e: string, a: boolean, bs?: string, be?: string) => void
}) {
  const [localStart, setLocalStart] = useState(start)
  const [localEnd, setLocalEnd] = useState(end)
  const [localActive, setLocalActive] = useState(active)
  const [localBreakStart, setLocalBreakStart] = useState(breakStart)
  const [localBreakEnd, setLocalBreakEnd] = useState(breakEnd)

  return (
    <div className="flex flex-col gap-3 p-3 border rounded-lg">
      <div className="flex items-center gap-3 flex-wrap">
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
          onClick={() => onSave(localStart, localEnd, localActive, localBreakStart, localBreakEnd)}
        >
          <Save className="h-4 w-4 mr-1" />Guardar
        </Button>
      </div>
      {localActive && (
        <div className="flex items-center gap-3 flex-wrap pl-0 sm:pl-[7.5rem]">
          <span className="text-xs text-muted-foreground">Almuerzo (no atender)</span>
          <Input
            type="time"
            value={localBreakStart}
            onChange={(e) => setLocalBreakStart(e.target.value)}
            className="w-28"
            aria-label="Inicio del almuerzo"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="time"
            value={localBreakEnd}
            onChange={(e) => setLocalBreakEnd(e.target.value)}
            className="w-28"
            aria-label="Fin del almuerzo"
          />
          {(localBreakStart || localBreakEnd) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setLocalBreakStart('')
                setLocalBreakEnd('')
                onSave(localStart, localEnd, localActive, '', '')
              }}
            >
              Quitar
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

interface Plan {
  id: string
  name: string
  durationDays: number
  price: number
  active: boolean
}

function LicenseTab({
  license,
  supportPhone,
  businessId,
}: {
  license: Business['license']
  supportPhone: string | null
  businessId: string
}) {
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/plans')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d)) setPlans(d)
      })
      .catch(() => {
        if (!cancelled) setPlans([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Al elegir un plan: genera un código de pago de 6 dígitos y abre el
  // WhatsApp del asesor con el mensaje para pagar esa suscripción.
  const handlePayPlan = async (plan: Plan) => {
    if (!supportPhone) {
      toast.error('Aún no hay teléfono de soporte configurado. Contacta al administrador.')
      return
    }
    if (payingPlanId) return
    setPayingPlanId(plan.id)
    try {
      const res = await fetch('/api/owner/payment-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, planId: plan.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo generar el código')
      const text = `💳 *SOLICITUD DE PAGO DE SUSCRIPCIÓN*

Hola, quiero pagar la suscripción *${plan.name}* de mi negocio.
💰 Precio: $${plan.price.toLocaleString('es-ES')} CUP
📅 Duración: ${plan.durationDays} días
🔑 Mi código de pago: *${data.code}*

Utilizo este código para realizar el pago. ¡Gracias!`
      const digits = supportPhone.replace(/[^0-9]/g, '')
      window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, '_blank')
      toast.success(`Código de pago generado: ${data.code}`, {
        description: 'Se abrió WhatsApp con el mensaje para el asesor. Guarda tu código.',
      })
    } catch (e: any) {
      toast.error(e.message || 'Error al generar el código de pago')
    } finally {
      setPayingPlanId(null)
    }
  }

  return (
    <div className="space-y-4">
      {license ? (
        (() => {
          const ok = license.active && new Date(license.endDate) > new Date()
          const daysLeft = Math.max(
            0,
            Math.ceil((new Date(license.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          )
          return (
            <Card className={`border-l-4 ${ok ? 'border-l-green-500' : 'border-l-red-500'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />Mi licencia
                </CardTitle>
                <CardDescription>Estado de tu licencia de uso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Inicio</div>
                      <div className="font-medium">
                        {new Date(license.startDate).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Vencimiento</div>
                      <div className="font-medium">
                        {new Date(license.endDate).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Duración</div>
                      <div className="font-medium">{license.durationDays} días</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Días restantes</div>
                      <div className="font-medium">{daysLeft}</div>
                    </div>
                  </div>
                  <Badge variant={ok ? 'default' : 'destructive'} className="text-sm px-3 py-1">
                    {ok ? 'ACTIVA' : 'EXPIRADA'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })()
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />Licencia
            </CardTitle>
            <CardDescription>Estado de tu licencia de uso</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Tu negocio aún no tiene una licencia registrada. Contacta al soporte para activar tu cuenta.
          </CardContent>
        </Card>
      )}

      {/* Ofertas / planes de suscripción (precios los define el admin) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />Planes de suscripción
          </CardTitle>
          <CardDescription>
            Renueva o amplía tu licencia con uno de nuestros planes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plans === null ? (
              [0, 1].map((i) => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
              ))
            ) : plans.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full">
                No hay planes disponibles por el momento.
              </p>
            ) : (
              plans.map((p) => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handlePayPlan(p)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePayPlan(p)}
                  className={`border rounded-xl p-4 flex flex-col gap-1 cursor-pointer transition-all hover:shadow-md hover:border-primary ${
                    p.durationDays >= 365 ? 'border-primary/60 bg-primary/5' : ''
                  } ${payingPlanId === p.id ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.name}</span>
                    <Badge variant="secondary">{p.durationDays} días</Badge>
                  </div>
                  <div className="text-3xl font-bold text-primary mt-1">
                    ${p.price.toLocaleString('es-ES')}
                    <span className="text-sm font-normal text-muted-foreground ml-1">CUP</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${Math.round(p.price / Math.max(1, p.durationDays * 1.0))} CUP/día aprox.
                  </div>
                  <Button size="sm" className="mt-2 w-full" disabled={payingPlanId === p.id}>
                    <CreditCard className="h-4 w-4 mr-1" />
                    {payingPlanId === p.id ? 'Generando código...' : 'Pagar por WhatsApp'}
                  </Button>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 p-3">
            Al elegir un plan se genera un código de pago de 6 dígitos y se abre WhatsApp con el
            asesor para completar el pago. El administrador aplica tu licencia al recibir el pago.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

interface OwnerStats {
  visitsTotal: number
  visitsLast30: number
  visitsByDay: { date: string; count: number }[]
  topCustomers: {
    name: string
    phone: string
    count: number
    completed: number
    lastDate: string
  }[]
}

function StatsTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<Appointment[] | null>(null)
  const [ownerStats, setOwnerStats] = useState<OwnerStats | null>(null)

  useEffect(() => {
    let cancelled = false
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 89)
    from.setHours(0, 0, 0, 0)
    const params = new URLSearchParams({ businessId, from: from.toISOString(), to: to.toISOString() })
    fetch(`/api/appointments?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(Array.isArray(d) ? d : [])
      })
      .catch(() => {
        if (!cancelled) setData([])
      })
    fetch(`/api/owner/stats?businessId=${businessId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d && !d.error) setOwnerStats(d)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [businessId])

  const chartData = useMemo(() => {
    if (!data) return null
    // Citas por día — últimos 30 días
    const byDay: { date: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const key = dayKey(d)
      byDay.push({ date: key, count: data.filter((a) => dayKey(new Date(a.date)) === key).length })
    }
    // Por estado
    const byStatus = (['pendiente', 'confirmada', 'completada', 'cancelada'] as const).map((s) => ({
      status: s,
      count: data.filter((a) => a.status === s).length,
    }))
    // Servicios top
    const byService = new Map<string, { name: string; count: number; revenue: number }>()
    for (const a of data) {
      if (a.status === 'cancelada') continue
      const name = a.service?.name || 'Servicio'
      const cur = byService.get(name) || { name, count: 0, revenue: 0 }
      cur.count += 1
      if (a.status === 'completada') cur.revenue += a.service?.price || 0
      byService.set(name, cur)
    }
    const topServices = [...byService.values()].sort((a, b) => b.count - a.count).slice(0, 5)

    const ingresos = data
      .filter((a) => a.status === 'completada')
      .reduce((s, a) => s + (a.service?.price || 0), 0)
    const noCanceladas = data.filter((a) => a.status !== 'cancelada')
    const tasa = noCanceladas.length
      ? Math.round((noCanceladas.filter((a) => a.status === 'completada').length / noCanceladas.length) * 100)
      : 0

    return { byDay, byStatus, topServices, ingresos, tasa, total: data.length }
  }, [data])

  if (!data || !chartData) {
    return (
      <div className="space-y-3">
        <div className="h-24 bg-muted animate-pulse rounded-xl" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Citas (90 días)</div>
            <div className="text-3xl font-bold">{chartData.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Ingresos completados</div>
            <div className="text-3xl font-bold text-primary">${chartData.ingresos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Tasa de finalización</div>
            <div className="text-3xl font-bold text-green-600">{chartData.tasa}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Servicios distintos</div>
            <div className="text-3xl font-bold">{chartData.topServices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Vistas totales</div>
            <div className="text-3xl font-bold">{ownerStats?.visitsTotal ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Vistas (30 días)</div>
            <div className="text-3xl font-bold">{ownerStats?.visitsLast30 ?? '—'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Vistas del negocio + clientes habituales */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vistas de tu negocio</CardTitle>
            <CardDescription>Visitas a tu página pública — últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent>
            {ownerStats ? (
              <ChartContainer
                config={{ visitas: { label: 'Visitas', color: 'var(--chart-3)' } }}
                className="h-[220px] w-full"
              >
                <AreaChart data={ownerStats.visitsByDay} margin={{ left: -18, right: 8, top: 4 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v: string) => {
                      const [, m, d] = v.split('-')
                      return `${Number(d)}/${Number(m)}`
                    }}
                    interval="preserveStartEnd"
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey="count"
                    type="monotone"
                    fill="var(--color-visitas)"
                    stroke="var(--color-visitas)"
                    fillOpacity={0.2}
                    name="Visitas"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[220px] bg-muted animate-pulse rounded-lg" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Clientes habituales</CardTitle>
            <CardDescription>Quienes más te eligen — últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent>
            {ownerStats === null ? (
              <div className="h-[220px] bg-muted animate-pulse rounded-lg" />
            ) : ownerStats.topCustomers.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                Aún no hay clientes recurrentes.
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {ownerStats.topCustomers.map((c, i) => (
                  <div
                    key={`${c.phone}-${i}`}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg border"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {c.name.trim().charAt(0).toUpperCase() || '?'}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {c.phone} · última:{' '}
                          {new Date(c.lastDate).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold">{c.count}</div>
                      <div className="text-[10px] text-muted-foreground">citas</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Citas por día — últimos 30 días</CardTitle>
            <CardDescription>Volumen diario de reservas</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ citas: { label: 'Citas', color: 'var(--chart-1)' } }}
              className="h-[220px] w-full"
            >
              <AreaChart data={chartData.byDay} margin={{ left: -18, right: 8, top: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(v: string) => {
                    const [, m, d] = v.split('-')
                    return `${Number(d)}/${Number(m)}`
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="count"
                  type="monotone"
                  fill="var(--color-citas)"
                  stroke="var(--color-citas)"
                  fillOpacity={0.2}
                  name="Citas"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Citas por estado</CardTitle>
            <CardDescription>Últimos 90 días</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                pendiente: { label: 'Pendiente', color: STATUS_COLORS.pendiente },
                confirmada: { label: 'Confirmada', color: STATUS_COLORS.confirmada },
                completada: { label: 'Completada', color: STATUS_COLORS.completada },
                cancelada: { label: 'Cancelada', color: STATUS_COLORS.cancelada },
              }}
              className="h-[220px] w-full"
            >
              <BarChart data={chartData.byStatus} margin={{ left: -18, right: 8, top: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="status"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => STATUS_LABELS[v] || v}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Citas">
                  {chartData.byStatus.map((s) => (
                    <Cell key={s.status} fill={STATUS_COLORS[s.status]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Servicios más pedidos</CardTitle>
            <CardDescription>Por cantidad de citas (90 días)</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.topServices.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                Sin datos todavía.
              </div>
            ) : (
              <ChartContainer
                config={{ citas: { label: 'Citas', color: 'var(--chart-2)' } }}
                className="h-[220px] w-full"
              >
                <BarChart data={chartData.topServices} layout="vertical" margin={{ left: 8, right: 8, top: 4 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    width={110}
                    tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-citas)" radius={[0, 4, 4, 0]} name="Citas" />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SettingsTab({
  businessId,
  form,
  onChange,
  onSave,
}: {
  businessId: string
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
          <div className="space-y-1.5">
            <Label>Provincia</Label>
            <Select
              value={form.province || 'none'}
              onValueChange={(v) => set('province', v === 'none' ? '' : v)}
            >
              <SelectTrigger aria-label="Provincia">
                <SelectValue placeholder="Selecciona una provincia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin provincia</SelectItem>
                {CUBA_PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />Imágenes (máx. 4: logo + 3 fotos)
          </Label>
          <p className="text-xs text-muted-foreground">
            Sube archivos JPG/PNG/WebP (máx. 5 MB cada uno). Al cambiar una imagen se sobreescribe la anterior.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImageField
              label="Logotipo"
              value={form.logo || ''}
              onChange={(url) => set('logo', url)}
              businessId={businessId}
              slot="logo"
            />
            <ImageField
              label="Foto de trabajo 1"
              value={form.photo1 || ''}
              onChange={(url) => set('photo1', url)}
              businessId={businessId}
              slot="img1"
            />
            <ImageField
              label="Foto de trabajo 2"
              value={form.photo2 || ''}
              onChange={(url) => set('photo2', url)}
              businessId={businessId}
              slot="img2"
            />
            <ImageField
              label="Foto de trabajo 3"
              value={form.photo3 || ''}
              onChange={(url) => set('photo3', url)}
              businessId={businessId}
              slot="img3"
            />
          </div>
        </div>

        <Button onClick={onSave} className="w-full">
          <Save className="h-4 w-4 mr-2" />Guardar cambios
        </Button>
      </CardContent>
    </Card>
  )
}
