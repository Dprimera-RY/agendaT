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
  KeyRound,
  Send,
  Bell,
  DollarSign,
} from 'lucide-react'
import { useRouterStore } from '@/lib/stores/router-store'
import { getGuestHash } from '@/lib/guest'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel'
import { VerifiedBadge } from '@/components/agenda/VerifiedBadge'
import { PushEnableButton } from '@/components/agenda/PushRegistrar'
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
  depositEnabled?: boolean
  depositAmount?: number
  certified?: boolean
  services: {
    id: string
    name: string
    description?: string
    price: number
    currency?: string
    durationMin: number
  }[]
  availabilities: { id: string; dayOfWeek: number; startTime: string; endTime: string }[]
}

interface Slot {
  start: string
  end: string
  available: boolean
}

interface ReviewItem {
  id: string
  rating: number
  customerName?: string | null
  comment?: string | null
  createdAt: string
}

interface ReviewsState {
  reviews: ReviewItem[]
  average: number | null
  count: number
  canReview: boolean
  alreadyReviewed: boolean
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// Link wa.me con mensaje pre-cargado de saludo e interés (solo dígitos en el número)
function whatsappContactLink(phone: string, businessName: string): string {
  const digits = phone.replace(/\D/g, '')
  const message = `¡Hola, ${businessName}! 👋 Estoy interesado(a) en sus servicios y me gustaría recibir más información. ¿Podrían ayudarme? ¡Gracias!`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function BusinessView({ slug }: { slug: string }) {
  const { navigate } = useRouterStore()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  // Calendario mensual visible en la página (independiente del diálogo de reserva)
  const [inlineMonth, setInlineMonth] = useState<Date>(new Date())
  const [inlineDate, setInlineDate] = useState<Date | null>(null)
  const [inlineSlots, setInlineSlots] = useState<Slot[] | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bookedSuccess, setBookedSuccess] = useState<{
    whatsapp: { to: string | null; message: string; link: string | null }
    appointment: { date: string; service: string }
  } | null>(null)
  const [reviewsState, setReviewsState] = useState<ReviewsState | null>(null)
  const [reviewsRefresh, setReviewsRefresh] = useState(0)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewName, setReviewName] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Cargar negocio
  useEffect(() => {
    fetch(`/api/businesses/by-slug?slug=${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        setBusiness(data)
        // Registrar visita para métricas del admin (fire-and-forget)
        fetch('/api/visits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: data.id }),
        }).catch(() => {})
      })
      .catch(() => {
        toast.error('Negocio no encontrado')
        navigate('/')
      })
      .finally(() => setLoading(false))
  }, [slug, navigate])

  // Cargar reseñas del negocio (y si el invitado puede / ya reseñó)
  useEffect(() => {
    if (!business) return
    const hash = getGuestHash()
    const params = new URLSearchParams({ businessId: business.id })
    if (hash) params.set('customerHash', hash)
    fetch(`/api/reviews?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setReviewsState({
          reviews: data.reviews || [],
          average: data.average ?? null,
          count: data.count || 0,
          canReview: !!data.canReview,
          alreadyReviewed: !!data.alreadyReviewed,
        })
      })
      .catch(() => {})
  }, [business, reviewsRefresh])

  // Verificar qué días están disponibles (por día de la semana)
  const availableDaysOfWeek = new Set(
    business?.availabilities.map((a) => a.dayOfWeek) || []
  )

  // Duración total de los servicios seleccionados (para calcular slots y validar)
  const totalDurationMin = (business?.services || [])
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.durationMin, 0)

  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
    setSelectedSlot(null)
  }

  function isDayAvailable(date: Date): boolean {
    if (!business || business.availabilities.length === 0) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return false
    return availableDaysOfWeek.has(date.getDay())
  }

  // Cargar slots del calendario inline (usa la duración del primer servicio o 30 min)
  // inlineSlots = null significa "sin día seleccionado o cargando"; [] = sin horarios
  useEffect(() => {
    if (!business || !inlineDate) return
    let cancelled = false
    const y = inlineDate.getFullYear()
    const m = String(inlineDate.getMonth() + 1).padStart(2, '0')
    const d = String(inlineDate.getDate()).padStart(2, '0')
    const duration = business.services[0]?.durationMin || 30
    fetch(`/api/slots?businessId=${business.id}&date=${y}-${m}-${d}&durationMin=${duration}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setInlineSlots(data.slots || [])
      })
      .catch(() => {
        if (!cancelled) setInlineSlots([])
      })
    return () => {
      cancelled = true
    }
  }, [business, inlineDate])

  // Cargar slots cuando cambia la fecha o la selección de servicios
  useEffect(() => {
    if (!business || !selectedDate) return
    setLoadingSlots(true)
    setSlots(null)
    setSelectedSlot(null)
    // Sin servicios seleccionados no hay duración que calcular
    if (totalDurationMin <= 0) {
      setSlots([])
      setLoadingSlots(false)
      return
    }
    // Fecha local (no UTC): toISOString() restaría un día en zonas UTC-5
    const y = selectedDate.getFullYear()
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const d = String(selectedDate.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`
    const params = new URLSearchParams({
      businessId: business.id,
      date: dateStr,
      durationMin: String(totalDurationMin),
    })
    fetch(`/api/slots?${params}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .catch(() => toast.error('Error al cargar slots'))
      .finally(() => setLoadingSlots(false))
  }, [business, selectedDate, totalDurationMin])

  const handleBook = async () => {
    if (!business || !selectedSlot || selectedServices.length === 0) return
    if (!customerName || !customerPhone) {
      toast.error('Nombre y teléfono son obligatorios')
      return
    }
    const phoneDigits = customerPhone.replace(/\D/g, '')
    if (phoneDigits.length < 8) {
      toast.error('Introduce un número de teléfono válido (sin el prefijo +53)')
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
          serviceIds: selectedServices,
          customerName,
          customerPhone: `+53${phoneDigits}`,
          customerEmail,
          customerHash: getGuestHash(),
          date: date.toISOString(),
          notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      const serviceNames = business.services
        .filter((s) => selectedServices.includes(s.id))
        .map((s) => s.name)
        .join(' + ')
      setBookedSuccess({
        whatsapp: data.whatsappNotification,
        appointment: {
          date: date.toISOString(),
          service: serviceNames,
        },
      })
      // Con cita nueva el invitado puede pasar a reseñar
      setReviewsRefresh((n) => n + 1)
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

  const handleReview = async () => {
    if (!business || !reviewRating) return
    setSubmittingReview(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          customerHash: getGuestHash(),
          customerName: reviewName,
          rating: reviewRating,
          comment: reviewComment,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      toast.success('¡Gracias por tu reseña!')
      setReviewName('')
      setReviewComment('')
      setReviewRating(0)
      setReviewsRefresh((n) => n + 1)
    } catch (e: any) {
      toast.error(e.message || 'Error al enviar la reseña')
    } finally {
      setSubmittingReview(false)
    }
  }

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
      {/* <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" />Volver al catálogo
      </Button> */}

      {/* HERO del negocio */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="grid md:grid-cols-2 gap-0">
          <div className="aspect-video md:aspect-square bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
            {business.logo ? (
              <img
                src={business.logo}
                alt={business.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-8xl font-bold text-primary/40">{business.name[0]}</span>
            )}
          </div>
          <div className="p-6 md:p-8 flex flex-col justify-center space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="secondary" className="mb-2">{business.category.name}</Badge>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2">
                  {business.name}
                  {business.certified && <VerifiedBadge className="h-6 w-6" />}
                </h1>
              </div>
              {reviewsState && reviewsState.count > 0 ? (
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-sm font-medium">{reviewsState.average}</span>
                  <span className="text-xs text-muted-foreground">({reviewsState.count})</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Star className="h-4 w-4" />
                  <span className="text-xs">Sin reseñas</span>
                </div>
              )}
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
              <Button
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => setBookingOpen(true)}
                disabled={business.services.length === 0}
              >
                <CalendarCheck className="h-5 w-5 mr-2" />
                {business.services.length === 0 ? 'Sin servicios' : 'Agendar cita'}
              </Button>
              {business.phone && (
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-green-600/40 text-green-700 hover:bg-green-50 hover:text-green-800"
                  asChild
                >
                  <a
                    href={whatsappContactLink(business.phone, business.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    WhatsApp
                  </a>
                </Button>
              )}
            </div>
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
          <Carousel opts={{ align: 'start', loop: photos.length > 1 }} className="w-full">
            <CarouselContent className="-ml-2">
              {photos.map((p, i) => (
                <CarouselItem key={i} className="pl-2 basis-[85%] sm:basis-1/2 md:basis-1/3">
                  <button
                    onClick={() => setSelectedPhoto(p)}
                    className="group relative aspect-square w-full overflow-hidden rounded-xl bg-muted hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={p}
                      alt={`Trabajo ${i + 1}`}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
            {photos.length > 1 && (
              <>
                <CarouselPrevious className="-left-3 hidden sm:flex" />
                <CarouselNext className="-right-3 hidden sm:flex" />
              </>
            )}
          </Carousel>
        </section>
      )}

      {/* CALENDARIO DE DISPONIBILIDAD (vista mensual) */}
      {business.availabilities.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Disponibilidad</h2>
            <p className="text-sm text-muted-foreground">
              Los días en color tienen espacio para citas. Selecciona uno para ver los horarios.
            </p>
          </div>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setInlineMonth(new Date(inlineMonth.getFullYear(), inlineMonth.getMonth() - 1, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium">
                  {MONTHS[inlineMonth.getMonth()]} {inlineMonth.getFullYear()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setInlineMonth(new Date(inlineMonth.getFullYear(), inlineMonth.getMonth() + 1, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {DAYS.map((d) => (
                  <div key={d} className="text-muted-foreground font-medium py-1">{d}</div>
                ))}
                {Array.from({ length: new Date(inlineMonth.getFullYear(), inlineMonth.getMonth(), 1).getDay() }).map((_, i) => (
                  <div key={`e${i}`} />
                ))}
                {Array.from({ length: new Date(inlineMonth.getFullYear(), inlineMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                  const date = new Date(inlineMonth.getFullYear(), inlineMonth.getMonth(), i + 1)
                  const available = isDayAvailable(date)
                  const isSel = inlineDate?.toDateString() === date.toDateString()
                  const isToday = today.toDateString() === date.toDateString()
                  return (
                    <button
                      key={i + 1}
                      disabled={!available}
                      onClick={() => {
                        setInlineSlots(null)
                        setInlineDate(date)
                      }}
                      className={`relative h-9 rounded-lg text-sm transition-colors ${
                        isSel
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : available
                            ? 'bg-green-50 text-green-800 hover:bg-green-100 font-medium'
                            : 'bg-muted/50 text-muted-foreground/40 cursor-not-allowed'
                      } ${isToday && !isSel ? 'ring-1 ring-primary/50' : ''}`}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>
              {/* Horarios del día seleccionado */}
              {inlineDate && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-sm font-medium">
                    Horarios para {inlineDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  {inlineSlots === null ? (
                    <p className="text-sm text-muted-foreground">Cargando horarios...</p>
                  ) : inlineSlots.some((s) => s.available) ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {inlineSlots.filter((s) => s.available).map((s) => (
                        <Button
                          key={s.start}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDate(inlineDate)
                            setSelectedSlot(s)
                            setBookingOpen(true)
                          }}
                        >
                          {s.start}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay horarios disponibles este día.</p>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    className="mt-1"
                    onClick={() => {
                      setSelectedDate(inlineDate)
                      setBookingOpen(true)
                    }}
                  >
                    <CalendarCheck className="h-4 w-4 mr-1" />
                    Agendar en este día
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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
                  <div className="text-base font-semibold text-primary">${s.price} {s.currency || 'CUP'}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1"
                    onClick={() => {
                      setSelectedServices([s.id])
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

      {/* RESEÑAS Y VALORACIONES */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Reseñas y valoraciones</h2>
          <p className="text-sm text-muted-foreground">
            {reviewsState && reviewsState.count > 0
              ? `${reviewsState.count} reseña${reviewsState.count === 1 ? '' : 's'} · ${reviewsState.average} de promedio`
              : 'Aún no hay reseñas para este negocio'}
          </p>
        </div>

        {/* Formulario: solo si tiene cita previa y aún no reseñó */}
        {reviewsState?.canReview && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Deja tu valoración</CardTitle>
              <CardDescription>
                Solo clientes con una cita en este negocio pueden reseñar, una única vez.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="rn">Tu nombre (opcional)</Label>
                <Input
                  id="rn"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  placeholder="Cómo quieres que te identifiquen"
                  maxLength={60}
                />
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setReviewRating(v)}
                    aria-label={`${v} estrella${v === 1 ? '' : 's'}`}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        v <= reviewRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/40'
                      }`}
                    />
                  </button>
                ))}
                {reviewRating > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground">{reviewRating}/5</span>
                )}
              </div>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Cuéntanos cómo fue tu experiencia (opcional)"
                rows={3}
              />
              <Button onClick={handleReview} disabled={!reviewRating || submittingReview}>
                <Send className="h-4 w-4 mr-2" />
                {submittingReview ? 'Enviando...' : 'Enviar reseña'}
              </Button>
            </CardContent>
          </Card>
        )}

        {reviewsState?.alreadyReviewed && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Ya dejaste tu reseña en este negocio. ¡Gracias por tu opinión!
          </div>
        )}

        {/* Listado de reseñas */}
        {reviewsState && reviewsState.reviews.length > 0 && (
          <div className="space-y-3">
            {reviewsState.reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {r.customerName || 'Cliente'}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <Star
                            key={v}
                            className={`h-3.5 w-3.5 ${
                              v <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString('es-ES', {
                        dateStyle: 'medium',
                      })}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-muted-foreground">{r.comment}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!reviewsState?.canReview && !reviewsState?.alreadyReviewed && (
          <p className="text-sm text-muted-foreground">
            ¿Ya agendaste aquí? Deja tu valoración tras tu visita y ayúdale a otros clientes a decidir.
          </p>
        )}
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
                ? business?.depositEnabled && business.depositAmount
                  ? 'Se notificó al dueño por WhatsApp. Confirma cuando realices el depósito.'
                  : 'Se notificó al dueño por WhatsApp. El dueño la confirmará en breve.'
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
                  {business?.depositEnabled && business.depositAmount ? (
                    <>
                      Tu cita quedó en estado <strong>pendiente</strong>. Este negocio exige un
                      depósito de <strong>${business.depositAmount}</strong> para confirmarla: acuerda
                      el pago directamente con el negocio y el dueño la confirmará al recibirlo.
                    </>
                  ) : (
                    <>
                      Tu cita quedó en estado <strong>pendiente</strong>. El dueño la confirmará en
                      breve.
                    </>
                  )}
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
                  Avisa al dueño por WhatsApp
                </div>
                <pre className="text-xs whitespace-pre-wrap font-mono bg-white/50 rounded p-3 border border-green-100">
{bookedSuccess.whatsapp.message}
                </pre>
                {bookedSuccess.whatsapp.link ? (
                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => window.open(bookedSuccess.whatsapp.link!, '_blank')}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Enviar al dueño ({bookedSuccess.whatsapp.to})
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    El negocio no tiene WhatsApp configurado. Guarda tu código de seguimiento.
                  </p>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notificaciones de tu cita
                  </div>
                  <PushEnableButton
                    target={{ targetType: 'customer', targetId: getGuestHash() }}
                    size="sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Actívalas para saber en tu móvil cuando el dueño confirme, reprograme o cancele
                  tu cita.
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 font-medium text-sm">
                  <KeyRound className="h-4 w-4" />
                  Tu código de seguimiento
                </div>
                <p className="text-xs text-amber-700/80">
                  Guárdalo para ver o cancelar tus citas desde cualquier dispositivo.
                </p>
                <code className="block text-xs font-mono bg-white/60 rounded p-2 border border-amber-200 break-all">
                  {getGuestHash()}
                </code>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => {
                  setBookingOpen(false)
                  setBookedSuccess(null)
                }}>
                  Cerrar
                </Button>
                <Button variant="outline" onClick={() => {
                  setBookingOpen(false)
                  setBookedSuccess(null)
                  navigate('/mis-citas')
                }}>
                  Ver mis citas
                </Button>
                <Button onClick={() => {
                  setBookedSuccess(null)
                  setSelectedSlot(null)
                  setSelectedServices([])
                }}>
                  Agendar otra cita
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Servicios (multi-selección) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Servicios (puedes elegir varios)</Label>
                  {totalDurationMin > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Total: {totalDurationMin} min · $
                      {business.services
                        .filter((s) => selectedServices.includes(s.id))
                        .reduce((sum, s) => sum + s.price, 0)}{' '}
                      {business.services.find((s) => selectedServices.includes(s.id))?.currency || 'CUP'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {business.services.map((s) => {
                    const isSelected = selectedServices.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggleService(s.id)}
                        className={`text-left p-3 rounded-lg border-2 transition-colors flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{s.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{s.durationMin} min</span>
                            <span className="font-bold text-primary text-xs">${s.price} {s.currency || 'CUP'}</span>
                          </div>
                        </div>
                        <CheckCircle2
                          className={`h-5 w-5 shrink-0 mt-0.5 ${
                            isSelected ? 'text-primary' : 'text-muted-foreground/30'
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
                {totalDurationMin > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Los servicios se agendarán uno tras otro. Deben caber en el horario del negocio.
                  </p>
                )}
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
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground font-medium">
                          +53
                        </span>
                        <Input
                          id="cp"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="5 123 4567"
                          inputMode="tel"
                          className="rounded-l-none"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Prefijo de Cuba fijo. Introduce solo tu número.
                      </p>
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
            <>
              {business?.depositEnabled && business.depositAmount ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
                  <DollarSign className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    Este negocio exige un depósito de{' '}
                    <strong>${business.depositAmount}</strong> para confirmar la cita. El método de
                    pago lo acuerdas directamente con el negocio; la cita queda pendiente hasta que
                    el dueño lo reciba.
                  </span>
                </div>
              ) : null}
              <DialogFooter>
                <Button variant="outline" onClick={() => setBookingOpen(false)}>Cancelar</Button>
                <Button
                  onClick={handleBook}
                  disabled={!selectedSlot || selectedServices.length === 0 || !customerName || !customerPhone || submitting}
                >
                  {submitting ? 'Agendando...' : 'Confirmar cita'}
                </Button>
              </DialogFooter>
            </>
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
