'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Calendar as CalIcon, Clock, MapPin, Sparkles, ChevronRight } from 'lucide-react'
import { useRouterStore } from '@/lib/stores/router-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

export function CatalogView() {
  const { navigate } = useRouterStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(null)

  // Búsqueda por disponibilidad
  const [searchDate, setSearchDate] = useState<string>('')
  const [searchTime, setSearchTime] = useState<string>('')
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)

  // Cargar categorías
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => setCategories(data))
      .catch(() => toast.error('No se pudieron cargar las categorías'))
  }, [])

  // Cargar negocios (con filtros)
  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (categoryId !== 'all') params.set('categoryId', categoryId)
    if (q.trim()) params.set('q', q.trim())
    fetch(`/api/businesses?${params}`)
      .then((r) => r.json())
      .then((data) => setBusinesses(data))
      .catch(() => toast.error('No se pudieron cargar los negocios'))
      .finally(() => setLoading(false))
  }, [categoryId, q])

  // Agrupar por categoría cuando no hay búsqueda activa
  const grouped = useMemo(() => {
    const map = new Map<string, { category: Category; businesses: Business[] }>()
    for (const b of businesses) {
      const catId = b.category.id
      if (!map.has(catId)) {
        const cat = categories.find((c) => c.id === catId)
        if (!cat) continue
        map.set(catId, { category: cat, businesses: [] })
      }
      map.get(catId)!.businesses.push(b)
    }
    return Array.from(map.values())
  }, [businesses, categories])

  // Filtrar por categoría clickeada
  const filteredGrouped = activeCategorySlug
    ? grouped.filter((g) => g.category.slug === activeCategorySlug)
    : grouped

  // Búsqueda por disponibilidad
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
      if (categoryId !== 'all') params.set('categoryId', categoryId)
      if (searchTime) params.set('time', searchTime)
      const res = await fetch(`/api/businesses/search?${params}`)
      const data = await res.json()
      setSearchResults(data)
      if (data.length === 0) {
        toast.info('No se encontraron negocios con disponibilidad para los criterios seleccionados')
      } else {
        toast.success(`Se encontraron ${data.length} negocios disponibles`)
      }
    } catch {
      toast.error('Error en la búsqueda')
    } finally {
      setSearching(false)
    }
  }

  // Establecer fecha por defecto a hoy
  useEffect(() => {
    if (!searchDate) {
      const today = new Date().toISOString().split('T')[0]
      setSearchDate(today)
    }
  }, [searchDate])

  return (
    <div className="container mx-auto px-4 py-8 space-y-10">
      {/* HERO */}
      <section className="text-center space-y-4 py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          Plataforma multi-negocio
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Encuentra y agenda tu próxima cita
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Busca por tipo de negocio o nombre. Filtra por día y hora disponible.
          Reserva en un solo clic, sin llamadas, sin esperas.
        </p>
      </section>

      {/* BÚSQUEDA POR DISPONIBILIDAD */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalIcon className="h-5 w-5 text-primary" />
            Buscar disponibilidad por día y hora
          </CardTitle>
          <CardDescription>
            Encuentra qué negocios tienen huecos libres para la fecha y franja horaria que necesitas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de negocio</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hora (opcional)</label>
              <Input
                type="time"
                value={searchTime}
                onChange={(e) => setSearchTime(e.target.value)}
              />
            </div>
            <Button onClick={handleSearchAvailability} disabled={searching} size="lg" className="w-full md:w-auto">
              {searching ? 'Buscando...' : 'Buscar disponibles'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            La hora es opcional. Si la indicas, mostraremos sólo negocios con slot libre a esa hora exacta.
          </p>
        </CardContent>
      </Card>

      {/* RESULTADOS DE BÚSQUEDA DE DISPONIBILIDAD */}
      {searchResults !== null && (
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {searchResults.length} negocio(s) con disponibilidad
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setSearchResults(null)}>
              Limpiar búsqueda
            </Button>
          </div>
          {searchResults.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                No se encontraron negocios con disponibilidad para tu búsqueda.
                Prueba con otra fecha u hora.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((r) => (
                <Card
                  key={r.id}
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/negocio/${r.slug}`)}
                >
                  <div className="aspect-video bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                    {r.logo ? (
                      <img src={r.logo} alt={r.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-5xl font-bold text-primary/30">
                        {r.name[0]}
                      </span>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {r.name}
                        </h3>
                        <Badge variant="secondary" className="mt-1">
                          {r.category.name}
                        </Badge>
                      </div>
                      <Badge variant="default">{r.availableCount} libres</Badge>
                    </div>
                    {r.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{r.address}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {r.availableSlots.slice(0, 5).map((s) => (
                        <span
                          key={s.start}
                          className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium"
                        >
                          {s.start}
                        </span>
                      ))}
                      {r.availableSlots.length > 5 && (
                        <span className="text-xs px-2 py-0.5 text-muted-foreground">
                          +{r.availableSlots.length - 5} más
                        </span>
                      )}
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      Ver negocio
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* CATÁLOGO POR CATEGORÍAS */}
      <section className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-2xl font-semibold">Explora por categoría</h2>
          {activeCategorySlug && (
            <Button variant="ghost" size="sm" onClick={() => setActiveCategorySlug(null)}>
              Ver todas
            </Button>
          )}
        </div>

        {/* Chips de categorías */}
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const Icon = getIcon(c.icon)
            const active = activeCategorySlug === c.slug
            return (
              <button
                key={c.id}
                onClick={() => setActiveCategorySlug(active ? null : c.slug)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card hover:bg-accent border-border'
                }`}
              >
                <Icon className="h-4 w-4" />
                {c.name}
                {c._count && c._count.businesses > 0 && (
                  <span className={`text-xs ${active ? 'opacity-80' : 'text-muted-foreground'}`}>
                    ({c._count.businesses})
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Búsqueda por texto */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre de negocio..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista de negocios agrupados por categoría */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredGrouped.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              No se encontraron negocios que coincidan con tu búsqueda.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {filteredGrouped.map(({ category, businesses: list }) => {
              const Icon = getIcon(category.icon)
              return (
                <div key={category.id} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map((b) => (
                      <BusinessCard key={b.id} business={b} onClick={() => navigate(`/negocio/${b.slug}`)} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function BusinessCard({ business, onClick }: { business: Business; onClick: () => void }) {
  return (
    <Card
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group flex flex-col"
      onClick={onClick}
    >
      <div className="aspect-video bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center relative overflow-hidden">
        {business.logo ? (
          <img src={business.logo} alt={business.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
        ) : business.photo1 ? (
          <img src={business.photo1} alt={business.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <span className="text-5xl font-bold text-primary/30">{business.name[0]}</span>
        )}
      </div>
      <CardContent className="p-4 flex-1 flex flex-col gap-2">
        <div>
          <h3 className="font-semibold group-hover:text-primary transition-colors">{business.name}</h3>
          <Badge variant="secondary" className="mt-1">{business.category.name}</Badge>
        </div>
        {business.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{business.description}</p>
        )}
        {business.address && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-auto">
            <MapPin className="h-3 w-3" />{business.address}
          </p>
        )}
        {business.services.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Desde</span>
            <span className="font-bold text-primary text-base">
              ${Math.min(...business.services.map((s) => s.price))}
            </span>
          </div>
        )}
        <Button size="sm" variant="outline" className="w-full mt-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          Ver y agendar
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  )
}
