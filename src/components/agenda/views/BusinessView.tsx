'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  CalendarCheck,
  CheckCircle2,
  ArrowLeft,
  Star,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useRouterStore } from '@/lib/stores/router-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

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
  category: { id: string; name: string; slug: string; icon: string }
  license?: { endDate: string; active: boolean } | null
  services: {
    id: string
    name: string
    description?: string
    price: number
    durationMin: number
  }[]
  availabilities: { id: string; dayOfWeek: number; startTime: string; endTime: string }[]
}

interface Slot {
  start: string
  end: string
  available: boolean
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export function BusinessView({ slug }: { slug: string }) {
  const { navigate } = useRouterStore()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bookedSuccess, setBookedSuccess] = useState<{
    whatsapp: { to: string; message: string }
    appointment: { date: string; service: string }
  } | null>(null)

  // Cargar negocio
  useEffect(() => {
    setLoading(true)
    fetch(`/api/businesses/by-slug?slug=${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        setBusiness(data)
        if (data.services.length > 0) {
          setSelectedService(data.services[0].id)
        }
      })
      .catch(() => {
        toast.error('Negocio no encontrado')
        navigate('/')
      })
      .finally(() => setLoading(false))
  }, [slug, navigate])

  // Verificar qué días están disponibles (por día de la semana)
  const availableDaysOfWeek = new Set(
    business?.availabilities.map((a) => a.dayOfWeek) || []
  )

  function isDayAvailable(date: Date): boolean {
    if (!business || business.availabilities.length === 0) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return false
    return availableDaysOfWeek.has(date.getDay())
  }

  // Cargar slots cuando cambia la fecha o servicio
  useEffect(() => {
    if (!business || !selectedDate) return
    setLoadingSlots(true)
    setSlots(null)
    setSelectedSlot(null)
    const dateStr = selectedDate.toISOString().split('T')[0]
    const params = new URLSearchParams({
      businessId: business.id,
      date: dateStr,
    })
    if (selectedService) params.set('serviceId', selectedService)
    fetch(`/api/slots?${params}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .catch(() => toast.error('Error al cargar slots'))
      .finally(() => setLoadingSlots(false))
  }, [business, selectedDate, selectedService])

  const handleBook = async () => {
    if (!business || !selectedSlot || !selectedService) return
    if (!customerName || !customerPhone) {
      toast.error('Nombre y teléfono son obligatorios')
      return
    }
    setSubmitting(true)
    try {
      const [h, m] = selectedSlot.start.split(':').map(Number)
      const date = new Date(selectedDate)
      date.setHours(h, m, 0, 0)
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          serviceId: selectedService,
          customerName,
          customerPhone,
          customerEmail,
          date: date.toISOString(),
          notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setBookedSuccess({
        whatsapp: data.whatsappNotification,
        appointment: {
          date: date.toISOString(),
          service: data.service?.name || '',
        },
      })
      // Recargar slots
      setSlots((prev) =>
        prev?.map((s) => (s.start === selectedSlot.start ? { ...s, available: false } : s)) || null
      )
      setSelectedSlot(null)
      toast.success('Cita agendada! Se envió notificación al negocio.')
    } catch (e: any) {
      toast.error(e.message || 'Error al agendar')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedServiceObj = business?.services.find((s) => s.id === selectedService)

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-72 bg-muted animate-pulse rounded-xl" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!business) return null

  const photos = [business.photo1, business.photo2, business.photo3].filter(Boolean) as string[]
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" />Volver al catálogo
      </Button>

      {/* HERO del negocio */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="grid md:grid-cols-2 gap-0">
          <div className="aspect-video md:aspect-square bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            {business.logo ? (
              <img src={business.logo} alt={business.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-8xl font-bold text-primary/40">{business.name[0]}</span>
            )}
          </div>
          <div className="p-6 md:p-8 flex flex-col justify-center space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="secondary" className="mb-2">{business.category.name}</Badge>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{business.name}</h1>
              </div>
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-sm font-medium">4.9</span>
              </div>
            </div>
            {business.description && (
              <p className="text-muted-foreground">{business.description}</p>
            )}
            <div className="grid grid-cols-1 gap-2 text-sm">
              {business.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />{business.address}
                </div>
              )}
              {business.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />{business.phone}
                </div>
              )}
              {business.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />{business.email}
                </div>
              )}
              {business.availabilities.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {business.availabilities
                    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                    .map((a) => `${DAYS[a.dayOfWeek]} ${a.startTime}-${a.endTime}`)
                    .join(' · ')}
                </div>
              )}
            </div>
            <Button
              size="lg"
              className="mt-2 w-full md:w-auto"
              onClick={() => setBookingOpen(true)}
              disabled={business.services.length === 0}
            >
              <CalendarCheck className="h-5 w-5 mr-2" />
              {business.services.length === 0 ? 'Sin servicios' : 'Agendar cita'}
            </Button>
            {business.services.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Este negocio aún no tiene servicios configurados.
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* GALERÍA de 3 fotos */}
      {photos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Galería de trabajos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {photos.map((p, i) => (
              <button
                key={i}
                onClick={() => setSelectedPhoto(p)}
                className="aspect-square overflow-hidden rounded-xl bg-muted hover:opacity-90 transition-opacity"
              >
                <img src={p} alt={`Trabajo ${i + 1}`} className="h-full w-full object-cover hover:scale-105 transition-transform" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* CARTA DE SERVICIOS Y PRECIOS */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Carta de servicios y precios</h2>
          <p className="text-sm text-muted-foreground">
            Elige un servicio al agendar tu cita
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {business.services.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-semibold">{s.name}</div>
                  {s.description && (
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />{s.durationMin} min
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">${s.price}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1"
                    onClick={() => {
                      setSelectedService(s.id)
                      setBookingOpen(true)
                    }}
                  >
                    Reservar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* MODAL de booking */}
      <Dialog open={bookingOpen} onOpenChange={(o) => {
        setBookingOpen(o)
        if (!o) {
          setSelectedSlot(null)
          setBookedSuccess(null)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              {bookedSuccess ? 'Cita agendada' : `Agendar en ${business.name}`}
            </DialogTitle>
            <DialogDescription>
              {bookedSuccess
                ? 'Se notificó al dueño por WhatsApp. Confirma cuando realices el depósito.'
                : 'Selecciona servicio, fecha y hora disponible. Un solo clic para reservar.'}
            </DialogDescription>
          </DialogHeader>

          {bookedSuccess ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <CheckCircle2 className="h-5 w-5" />
                  ¡Cita registrada con éxito!
                </div>
                <p className="text-sm text-muted-foreground">
                  Tu cita quedó en estado <strong>pendiente</strong>. El dueño la confirmará
                  una vez recibido el depósito.
                </p>
                <div className="text-sm space-y-1 mt-3 pt-3 border-t border-primary/10">
                  <div><strong>Servicio:</strong> {bookedSuccess.appointment.service}</div>
                  <div>
                    <strong>Fecha:</strong>{' '}
                    {new Date(bookedSuccess.appointment.date).toLocaleString('es-ES', {
                      dateStyle: 'full',
                      timeStyle: 'short',
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                  <MessageCircle className="h-4 w-4" />
                  Notificación WhatsApp enviada al dueño
                </div>
                <pre className="text-xs whitespace-pre-wrap font-mono bg-white/50 rounded p-3 border border-green-100">
{bookedSuccess.whatsapp.message}
                </pre>
                <p className="text-xs text-muted-foreground">
                  Para: <strong>{bookedSuccess.whatsapp.to}</strong> (simulado)
                </p>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => {
                  setBookingOpen(false)
                  setBookedSuccess(null)
                }}>
                  Cerrar
                </Button>
                <Button onClick={() => {
                  setBookedSuccess(null)
                  setSelectedSlot(null)
                }}>
                  Agendar otra cita
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Servicio */}
              <div className="space-y-2">
                <Label>Servicio</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {business.services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedService(s.id)}
                      className={`text-left p-3 rounded-lg border-2 transition-colors ${
                        selectedService === s.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{s.name}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{s.durationMin} min</span>
                        <span className="font-bold text-primary">${s.price}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendario */}
              <div className="space-y-2">
                <Label>Fecha</Label>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium text-sm">
                      {MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {DAYS.map((d) => (
                      <div key={d} className="text-muted-foreground font-medium py-1">{d}</div>
                    ))}
                    {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() }).map((_, i) => (
                      <div key={`e${i}`} />
                    ))}
                    {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i + 1)
                      const available = isDayAvailable(date)
                      const isSelected = selectedDate.toDateString() === date.toDateString()
                      const isToday = today.toDateString() === date.toDateString()
                      return (
                        <button
                          key={i + 1}
                          disabled={!available}
                          onClick={() => setSelectedDate(date)}
                          className={`aspect-square rounded-md text-sm transition-colors ${
                            !available
                              ? 'text-muted-foreground/30 cursor-not-allowed'
                              : isSelected
                              ? 'bg-primary text-primary-foreground font-bold'
                              : isToday
                              ? 'bg-primary/10 text-primary font-semibold hover:bg-primary/20'
                              : 'hover:bg-accent'
                          }`}
                        >
                          {i + 1}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Slots */}
              <div className="space-y-2">
                <Label>Horarios disponibles</Label>
                {loadingSlots ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-9 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : !slots || slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3">
                    No hay horarios disponibles este día. Prueba con otra fecha.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {slots.map((slot) => (
                      <button
                        key={slot.start}
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot)}
                        className={`text-sm py-2 rounded-md border transition-colors ${
                          !slot.available
                            ? 'bg-muted text-muted-foreground/40 cursor-not-allowed line-through'
                            : selectedSlot?.start === slot.start
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:bg-accent hover:border-primary/50'
                        }`}
                      >
                        {slot.start}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Datos del cliente */}
              {selectedSlot && (
                <div className="space-y-3 border-t pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cn">Nombre *</Label>
                      <Input id="cn" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Tu nombre" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cp">Teléfono / WhatsApp *</Label>
                      <Input id="cp" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+53..." />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ce">Email (opcional)</Label>
                    <Input id="ce" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="tucorreo@..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="no">Notas (opcional)</Label>
                    <Textarea id="no" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Información adicional para el negocio" rows={2} />
                  </div>
                </div>
              )}
            </div>
          )}

          {!bookedSuccess && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setBookingOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleBook}
                disabled={!selectedSlot || !selectedService || !customerName || !customerPhone || submitting}
              >
                {submitting ? 'Agendando...' : 'Confirmar cita'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Visor de foto ampliada */}
      <Dialog open={!!selectedPhoto} onOpenChange={(o) => !o && setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          {selectedPhoto && (
            <img src={selectedPhoto} alt="Foto ampliada" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
