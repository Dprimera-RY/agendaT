'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  Search,
  Calendar as CalIcon,
  MapPin,
  Sparkles,
  ChevronRight,
  X,
  Store,
  CalendarCheck,
  Loader2,
} from 'lucide-react'
import { useRouterStore } from '@/lib/stores/router-store'
import { CUBA_PROVINCES } from '@/lib/provinces'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import * as LucideIcons from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  icon: string
  description?: string
  _count?: { businesses: number }
}

interface Business {
  id: string
  slug: string
  name: string
  description?: string
  logo?: string | null
  photo1?: string | null
  address?: string | null
  province?: string | null
  phone?: string | null
  category: { id: string; name: string; slug: string; icon: string }
  services: { id: string; name: string; price: number }[]
  license?: { endDate: string; active: boolean } | null
}

interface SearchResult {
  id: string
  slug: string
  name: string
  description?: string
  logo?: string | null
  photo1?: string | null
  address?: string | null
  phone?: string | null
  category: { id: string; name: string; slug: string; icon: string }
  totalSlots: number
  availableCount: number
  availableSlots: { start: string; available: boolean }[]
  hasTimeMatch: boolean
}

function getIcon(name: string) {
  const Icon = (LucideIcons as any)[name] || Sparkles
  return Icon
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

// Persistencia del filtro de provincia del visitante
const PROVINCE_STORAGE_KEY = 'agenda_province'

export function CatalogView() {
  const { navigate } = useRouterStore()
  const [categories, setCategories] = useState<Category[]>([])

  // Lista de negocios: null = aún sin cargar (deriva el estado de loading)
  const [businesses, setBusinesses] = useState<Business[] | null>(null)
  const [q, setQ] = useState('')
  const deferredQ = useDeferredValue(q)
  const [categoryId, setCategoryId] = useState<string>('all')

  // Filtro de provincia (persistido en localStorage; modal solo la primera vez)
  const [province, setProvince] = useState<string>('all')
  const [provinceModalOpen, setProvinceModalOpen] = useState(false)
  const [modalProvince, setModalProvince] = useState<string>('all')

  // Modal de reserva (búsqueda por disponibilidad)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchCatId, setSearchCatId] = useState<string>('all')
  const [searchDate, setSearchDate] = useState<string>(todayISO)
  const [searchTime, setSearchTime] = useState<string>('')
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)

  // Categorías con tiendas activas; se recargan al cambiar de provincia
  // y se limpia la categoría activa si desaparece de la lista.
  useEffect(() => {
    const params = new URLSearchParams()
    if (province !== 'all') params.set('province', province)
    fetch(`/api/categories?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setCategories(data)
        setCategoryId((prev) =>
          prev !== 'all' && !data.some((c: Category) => c.id === prev) ? 'all' : prev
        )
      })
      .catch(() => toast.error('No se pudieron cargar las categorías'))
  }, [province])

  // Cargar provincia guardada; si es la primera visita, abrir el modal de selección
  useEffect(() => {
    // setTimeout: evita setState síncrono en el cuerpo del effect
    const t = setTimeout(() => {
      let saved: string | null = null
      try {
        saved = window.localStorage.getItem(PROVINCE_STORAGE_KEY)
      } catch {
        saved = null
      }
      if (saved && (saved === 'all' || CUBA_PROVINCES.includes(saved as any))) {
        setProvince(saved)
        setModalProvince(saved)
      } else {
        setProvinceModalOpen(true)
      }
    }, 0)
    return () => clearTimeout(t)
  }, [])

  const applyProvince = (value: string) => {
    setProvince(value)
    setModalProvince(value)
    try {
      window.localStorage.setItem(PROVINCE_STORAGE_KEY, value)
    } catch {
      // localStorage no disponible: el filtro sigue funcionando en memoria
    }
    setProvinceModalOpen(false)
  }

  // Búsqueda de negocios (por nombre, descripción o servicio), con deferred value
  // como debounce natural y sin setState sincrónico dentro del effect.
  useEffect(() => {
    const params = new URLSearchParams()
    if (categoryId !== 'all') params.set('categoryId', categoryId)
    if (deferredQ.trim()) params.set('q', deferredQ.trim())
    if (province !== 'all') params.set('province', province)
    let cancelled = false
    fetch(`/api/businesses?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setBusinesses(data)
      })
      .catch(() => {
        if (!cancelled) {
          setBusinesses([])
          toast.error('No se pudieron cargar los negocios')
        }
      })
    return () => {
      cancelled = true
    }
  }, [deferredQ, categoryId, province])

  const loading = businesses === null || deferredQ !== q

  // Chips de categoría → filtran por categoryId en la API
  const activeCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) || null,
    [categories, categoryId]
  )

  const toggleCategory = (c: Category) => {
    setCategoryId((prev) => (prev === c.id ? 'all' : c.id))
  }

  // Aplicar el filtro de categoría actual al abrir el modal de reserva
  const openSearch = () => {
    setSearchCatId(categoryId)
    setSearchOpen(true)
  }

  const handleSearchAvailability = async () => {
    if (!searchDate) {
      toast.error('Selecciona una fecha')
      return
    }
    setSearching(true)
    setSearchResults(null)
    try {
      const params = new URLSearchParams({
        date: searchDate,
        durationMin: '60',
      })
      if (searchCatId !== 'all') params.set('categoryId', searchCatId)
      // La búsqueda de disponibilidad respeta la provincia filtrada del catálogo
      if (province !== 'all') params.set('province', province)
      if (searchTime) params.set('time', searchTime)
      const res = await fetch(`/api/businesses/search?${params}`)
      const data = await res.json()
      if (data?.error) {
        toast.error(data.error)
        return
      }
      setSearchResults(data)
      if (data.length === 0) {
        toast.info('No hay negocios con disponibilidad para esos criterios')
      }
    } catch {
      toast.error('Error en la búsqueda')
    } finally {
      setSearching(false)
    }
  }

  const clearFilters = () => {
    setQ('')
    setCategoryId('all')
  }

  return (
    <div className="relative min-h-full">
      <div className="container mx-auto px-4 py-10 space-y-10 pb-28">
        {/* HERO con énfasis en la búsqueda */}
        <section className="text-center space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Plataforma multi-negocio
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Encuentra el servicio que necesitas
            <span className="block bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              y reserva en segundos
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Busca negocios o servicios por nombre, filtra por categoría y agenda
            tu cita sin llamadas ni esperas.
          </p>

          {/* Buscador principal */}
          <div className="mx-auto w-full max-w-2xl">
            <div className="group relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por negocio o servicio... (ej. corte, uñas, barbería)"
                className="h-14 rounded-2xl border-2 bg-card pl-12 pr-24 text-base shadow-sm transition-shadow focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20 md:text-lg"
              />
              <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
                {loading && q !== deferredQ && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {q && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQ('')}
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              ¿Sabes qué hora te conviene? Usa el botón{" "}
              <span className="font-medium text-foreground">Reservar</span> para
              buscar huecos disponibles por día y hora.
            </p>
          </div>

          {/* Chips de categorías */}
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {categories.map((c) => {
                const Icon = getIcon(c.icon)
                const active = categoryId === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCategory(c)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
                      active
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {c.name}
                    {c._count && c._count.businesses > 0 && (
                      <span className={`text-xs ${active ? 'opacity-80' : 'text-muted-foreground'}`}>
                        {c._count.businesses}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* RESULTADOS */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-semibold md:text-2xl">
              <Store className="h-5 w-5 text-primary" />
              {deferredQ.trim() || activeCategory || province !== 'all'
                ? `${businesses?.length ?? 0} resultado(s)`
                : `${businesses?.length ?? 0} negocios disponibles`}
              {activeCategory && (
                <Badge variant="secondary" className="ml-1">
                  {activeCategory.name}
                </Badge>
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={province} onValueChange={applyProvince}>
                <SelectTrigger className="w-[200px] h-9" aria-label="Filtrar por provincia">
                  <MapPin className="h-4 w-4 mr-1 text-primary" />
                  <SelectValue placeholder="Provincia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las provincias</SelectItem>
                  {CUBA_PROVINCES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(q || categoryId !== 'all') && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-4 w-4" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>

          {loading && !businesses ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : !businesses || businesses.length === 0 ? (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Store className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="font-medium">No encontramos negocios</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Prueba con otro término de búsqueda o elimina los filtros
                  activos para ver todo el catálogo.
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Ver todo el catálogo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div
              className={`grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
                loading ? 'opacity-60' : ''
              }`}
            >
              {businesses.map((b) => (
                <BusinessCard
                  key={b.id}
                  business={b}
                  query={deferredQ.trim().toLowerCase()}
                  onClick={() => navigate(`/negocio/${b.slug}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* BOTÓN FLOTANTE: Reservar */}
      <button
        onClick={openSearch}
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-4 font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:scale-105 hover:bg-primary/90 active:scale-95"
      >
        <CalIcon className="h-5 w-5" />
        <span className="hidden sm:inline">Reservar cita</span>
        <span className="sm:hidden">Reservar</span>
      </button>

      {/* MODAL DE BÚSQUEDA / RESERVA */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CalendarCheck className="h-5 w-5 text-primary" />
              Reservar una cita
            </DialogTitle>
            <DialogDescription>
              Elige la fecha y la franja horaria que te conviene y te mostramos
              los negocios con disponibilidad.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo de negocio</label>
              <Select value={searchCatId} onValueChange={setSearchCatId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="date"
                value={searchDate}
                min={todayISO()}
                onChange={(e) => setSearchDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Hora (opcional)</label>
              <Input
                type="time"
                value={searchTime}
                onChange={(e) => setSearchTime(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleSearchAvailability}
            disabled={searching}
            size="lg"
            className="w-full"
          >
            {searching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando disponibilidad...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Buscar disponibilidad
              </>
            )}
          </Button>

          {searchResults !== null && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {searchResults.length === 0
                  ? 'Sin disponibilidad para estos criterios.'
                  : `${searchResults.length} negocio(s) con disponibilidad:`}
              </p>
              {searchResults.length === 0 ? (
                <Card className="rounded-xl border-dashed">
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Prueba con otra fecha, hora o categoría.
                  </CardContent>
                </Card>
              ) : (
                <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSearchOpen(false)
                        navigate(`/negocio/${r.slug}`)
                      }}
                      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:bg-accent/50"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
                        {r.logo || r.photo1 ? (
                          <img
                            src={r.logo || r.photo1 || ''}
                            alt={r.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-primary/40">
                            {r.name[0]}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium group-hover:text-primary">
                            {r.name}
                          </p>
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            {r.category.name}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {r.availableSlots.slice(0, 6).map((s) => (
                            <span
                              key={s.start}
                              className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
                            >
                              {s.start}
                            </span>
                          ))}
                          {r.availableSlots.length > 6 && (
                            <span className="text-xs text-muted-foreground">
                              +{r.availableSlots.length - 6}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
                        {r.availableCount} libres
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL de provincia (solo la primera visita; después se cambia con el Select) */}
      <Dialog open={provinceModalOpen} onOpenChange={(o) => {
        // Al cerrar sin aplicar, se queda con la última selección válida (o todas)
        setProvinceModalOpen(o)
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Elige tu provincia
            </DialogTitle>
            <DialogDescription>
              Te mostramos primero los negocios de tu provincia. Puedes cambiarlo cuando quieras.
            </DialogDescription>
          </DialogHeader>
          <Select value={modalProvince} onValueChange={setModalProvince}>
            <SelectTrigger className="w-full" aria-label="Provincia">
              <SelectValue placeholder="Selecciona una provincia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las provincias</SelectItem>
              {CUBA_PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => applyProvince('all')}>
              Ver todas
            </Button>
            <Button onClick={() => applyProvince(modalProvince)}>
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BusinessCard({
  business,
  query,
  onClick,
}: {
  business: Business
  query: string
  onClick: () => void
}) {
  // Servicios que coinciden con la búsqueda activa (la API ya filtra por ellos)
  const matchedServices = query
    ? business.services.filter((s) => s.name.toLowerCase().includes(query))
    : []
  const minPrice =
    business.services.length > 0
      ? Math.min(...business.services.map((s) => s.price))
      : null

  return (
    <Card
      onClick={onClick}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {business.logo || business.photo1 ? (
          <img
            src={business.logo || business.photo1 || ''}
            alt={business.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <span className="text-5xl font-bold text-primary/30">
              {business.name[0]}
            </span>
          </div>
        )}
        <Badge className="absolute left-3 top-3 bg-background/90 text-foreground backdrop-blur">
          {business.category.name}
        </Badge>
        {business.province && (
          <Badge
            variant="outline"
            className="absolute right-3 top-3 bg-background/90 text-foreground backdrop-blur"
          >
            <MapPin className="mr-1 h-3 w-3" />
            {business.province}
          </Badge>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-semibold transition-colors group-hover:text-primary">
          {business.name}
        </h3>
        {business.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {business.description}
          </p>
        )}

        {matchedServices.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {matchedServices.slice(0, 3).map((s) => (
              <span
                key={s.id}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              >
                {s.name}
              </span>
            ))}
          </div>
        )}

        {business.address && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{business.address}</span>
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          {minPrice !== null ? (
            <p className="text-sm text-muted-foreground">
              Desde{' '}
              <span className="text-lg font-bold text-primary">${minPrice}</span>
            </p>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center text-sm font-medium text-primary">
            Ver y agendar
            <ChevronRight className="ml-0.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
