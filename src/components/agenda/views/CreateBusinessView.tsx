'use client'

import { useEffect, useState } from 'react'
import { useRouterStore } from '@/lib/stores/router-store'
import { useAuth } from '@/lib/stores/auth-store'
import { CUBA_PROVINCES } from '@/lib/provinces'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageField } from '@/components/agenda/ImageField'
import { toast } from 'sonner'
import { ArrowLeft, Building2, Sparkles, Check } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  icon: string
  description?: string
}

export function CreateBusinessView() {
  const { navigate } = useRouterStore()
  const { session, fetchMe, loading: authLoading } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    address: '',
    province: '',
    phone: session.role === 'owner' ? '' : '',
    email: '',
    categoryId: '',
    logo: '',
    photo1: '',
    photo2: '',
    photo3: '',
  })

  useEffect(() => {
    // Esperar a que termine la carga de la sesión antes de decidir
    if (authLoading) return
    if (!session.role) {
      navigate('/login')
      return
    }
    fetch('/api/categories')
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => toast.error('No se pudieron cargar las categorías'))
  }, [session.role, authLoading, navigate])

  // Auto-generar slug desde el nombre
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.slug || !form.categoryId) {
      toast.error('Nombre, URL y categoría son obligatorios')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/businesses/mine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear')

      toast.success('¡Negocio creado! Te damos 30 días de prueba.')
      // Refrescar la sesión para que aparezca el negocio en el dropdown
      await fetchMe()
      navigate(`/negocio/${data.slug}/panel`)
    } catch (e: any) {
      toast.error(e.message || 'Error al crear el negocio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="-ml-2 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Volver al catálogo
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Crea tu negocio
          </CardTitle>
          <CardDescription>
            Configura los datos básicos de tu negocio. Tu página pública estará disponible en{' '}
            <code className="bg-muted px-1 rounded text-primary">/negocio/[url]</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="biz-name">Nombre del negocio *</Label>
                <Input
                  id="biz-name"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setForm({
                      ...form,
                      name,
                      slug: slugify(name),
                    })
                  }}
                  placeholder="Estudio Aura"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="biz-slug">URL pública (auto) *</Label>
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground pr-2 border-r h-10 flex items-center">
                    /negocio/
                  </span>
                  <Input
                    id="biz-slug"
                    className="rounded-l-none ml-1 bg-muted/50 cursor-not-allowed"
                    value={form.slug}
                    readOnly
                    placeholder="Se genera desde el nombre"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Categoría *</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm({ ...form, categoryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de negocio..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.description ? ` — ${c.description}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="biz-desc">Descripción</Label>
              <Textarea
                id="biz-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe brevemente tu negocio, qué servicios ofreces, qué te diferencia..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="biz-address">Dirección</Label>
                <Input
                  id="biz-address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Calle, número, ciudad"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Provincia</Label>
                <Select value={form.province || 'none'} onValueChange={(v) => setForm({ ...form, province: v === 'none' ? '' : v })}>
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
              <div className="space-y-1.5">
                <Label htmlFor="biz-phone">Teléfono / WhatsApp</Label>
                <Input
                  id="biz-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+53 5xxx xxxx"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="biz-email">Email</Label>
              <Input
                id="biz-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="hola@minegocio.com"
              />
            </div>

            <ImageField
              label="Logotipo (opcional, puedes añadirlo después)"
              value={form.logo}
              onChange={(url) => setForm({ ...form, logo: url })}
            />

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Creando...' : 'Crear negocio'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* What's next */}
      <Card className="mt-4 bg-primary/5 border-primary/20">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-medium text-primary flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            Después de crear tu negocio podrás:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Configurar tus servicios y precios
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Definir tus horarios de atención
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Subir tu logo y 3 fotos de tus trabajos
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Gestionar y confirmar citas desde el calendario
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
