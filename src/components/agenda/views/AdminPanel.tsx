'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ShieldCheck,
  Building2,
  Users,
  KeyRound,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar as CalIcon,
} from 'lucide-react'
import { useRouterStore } from '@/lib/stores/router-store'
import { useAuth } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

interface Owner {
  id: string
  username: string
  name: string
  email?: string | null
  phone?: string | null
  createdAt: string
  _count?: { businesses: number }
}

interface AdminBusiness {
  id: string
  slug: string
  name: string
  createdAt: string
  category: { id: string; name: string; slug: string }
  owner: { id: string; username: string; name: string }
  license?: {
    id: string
    startDate: string
    endDate: string
    durationDays: number
    active: boolean
  } | null
  _count?: { appointments: number; services: number }
}

interface License {
  id: string
  businessId: string
  startDate: string
  endDate: string
  durationDays: number
  active: boolean
  business: { id: string; name: string; slug: string }
}

interface Category {
  id: string
  name: string
  slug: string
  icon: string
}

export function AdminPanel() {
  const { navigate } = useRouterStore()
  const { session, loading: authLoading } = useAuth()
  const [tab, setTab] = useState('overview')
  const [owners, setOwners] = useState<Owner[]>([])
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([])
  const [licenses, setLicenses] = useState<License[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Form: crear owner
  const [showOwnerForm, setShowOwnerForm] = useState(false)
  const [ownerForm, setOwnerForm] = useState({ username: '', password: '', name: '', email: '', phone: '' })

  // Form: crear negocio
  const [showBizForm, setShowBizForm] = useState(false)
  const [bizForm, setBizForm] = useState({
    name: '',
    slug: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    ownerId: '',
    categoryId: '',
    licenseDays: '30',
  })

  // Form: extender licencia
  const [showLicForm, setShowLicForm] = useState(false)
  const [licForm, setLicForm] = useState({ businessId: '', addDays: '30' })

  useEffect(() => {
    // Esperar a que termine la carga de la sesión antes de decidir
    if (authLoading) return
    if (session.role !== 'admin') {
      navigate('/login')
      return
    }
  }, [session.role, authLoading, navigate])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [o, b, l, c] = await Promise.all([
        fetch('/api/admin/owners').then((r) => r.json()),
        fetch('/api/admin/businesses').then((r) => r.json()),
        fetch('/api/admin/licenses').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
      ])
      setOwners(o)
      setBusinesses(b)
      setLicenses(l)
      setCategories(c)
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session.role === 'admin') loadAll()
  }, [session.role, loadAll])

  // === Acciones ===
  const createOwner = async () => {
    if (!ownerForm.username || !ownerForm.password || !ownerForm.name) {
      toast.error('Completa campos obligatorios')
      return
    }
    try {
      const res = await fetch('/api/admin/owners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ownerForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Dueño creado')
      setShowOwnerForm(false)
      setOwnerForm({ username: '', password: '', name: '', email: '', phone: '' })
      await loadAll()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const deleteOwner = async (id: string) => {
    if (!confirm('¿Eliminar este dueño y todos sus negocios?')) return
    try {
      await fetch(`/api/admin/owners?id=${id}`, { method: 'DELETE' })
      toast.success('Dueño eliminado')
      await loadAll()
    } catch {
      toast.error('Error')
    }
  }

  const createBusiness = async () => {
    if (!bizForm.name || !bizForm.slug || !bizForm.ownerId || !bizForm.categoryId) {
      toast.error('Completa campos obligatorios')
      return
    }
    try {
      const res = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bizForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Negocio creado')
      setShowBizForm(false)
      setBizForm({ name: '', slug: '', description: '', address: '', phone: '', email: '', ownerId: '', categoryId: '', licenseDays: '30' })
      await loadAll()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const deleteBusiness = async (id: string) => {
    if (!confirm('¿Eliminar este negocio y todos sus datos?')) return
    try {
      await fetch(`/api/admin/businesses?id=${id}`, { method: 'DELETE' })
      toast.success('Negocio eliminado')
      await loadAll()
    } catch {
      toast.error('Error')
    }
  }

  const extendLicense = async () => {
    if (!licForm.businessId || !licForm.addDays) {
      toast.error('Indica negocio y días')
      return
    }
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: licForm.businessId,
          addDays: Number(licForm.addDays),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Licencia extendida ${licForm.addDays} días`)
      setShowLicForm(false)
      setLicForm({ businessId: '', addDays: '30' })
      await loadAll()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const toggleLicense = async (businessId: string, action: 'activate' | 'deactivate') => {
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, action }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Licencia ${action === 'activate' ? 'activada' : 'desactivada'}`)
      await loadAll()
    } catch {
      toast.error('Error')
    }
  }

  // Si la sesión sigue cargando, mostrar skeleton
  if (authLoading || session.role === null) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (session.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Acceso restringido a administradores.</p>
        <Button className="mt-4" onClick={() => navigate('/login')}>Iniciar sesión como root</Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    )
  }

  const totalActiveLicenses = licenses.filter((l) => l.active && new Date(l.endDate) > new Date()).length
  const expiringSoon = licenses.filter((l) => {
    const days = (new Date(l.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return l.active && days > 0 && days <= 7
  })
  const expired = licenses.filter((l) => l.active && new Date(l.endDate) < new Date())

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Panel de administración</h1>
          <p className="text-sm text-muted-foreground">Gestión de negocios, dueños y licencias</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="businesses">
            <Building2 className="h-4 w-4 mr-1 md:mr-0" />
            <span className="md:ml-1">Negocios</span>
          </TabsTrigger>
          <TabsTrigger value="owners">
            <Users className="h-4 w-4 mr-1 md:mr-0" />
            <span className="md:ml-1">Dueños</span>
          </TabsTrigger>
          <TabsTrigger value="licenses">
            <KeyRound className="h-4 w-4 mr-1 md:mr-0" />
            <span className="md:ml-1">Licencias</span>
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />Negocios
                </div>
                <div className="text-3xl font-bold">{businesses.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />Dueños
                </div>
                <div className="text-3xl font-bold">{owners.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <KeyRound className="h-3 w-3" />Licencias activas
                </div>
                <div className="text-3xl font-bold text-green-600">{totalActiveLicenses}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />Por expirar
                </div>
                <div className="text-3xl font-bold text-amber-600">{expiringSoon.length + expired.length}</div>
              </CardContent>
            </Card>
          </div>

          {expired.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700 text-lg flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Licencias expiradas ({expired.length})
                </CardTitle>
                <CardDescription>Estos negocios no aparecen en el catálogo público</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {expired.map((l) => (
                  <div key={l.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div>
                      <div className="font-medium">{l.business.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Expiró: {new Date(l.endDate).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => toggleLicense(l.businessId, 'activate')}>
                      Renovar / Reactivar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {expiringSoon.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-700 text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Por expirar pronto ({expiringSoon.length})
                </CardTitle>
                <CardDescription>Renueva antes de que caduquen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {expiringSoon.map((l) => (
                  <div key={l.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div>
                      <div className="font-medium">{l.business.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Expira en {Math.ceil((new Date(l.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} días
                      </div>
                    </div>
                    <Button size="sm" onClick={() => {
                      setLicForm({ businessId: l.businessId, addDays: '30' })
                      setShowLicForm(true)
                    }}>
                      Extender
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* NEGOCIOS */}
        <TabsContent value="businesses" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{businesses.length} negocios</h2>
            <Button onClick={() => setShowBizForm(true)}>
              <Plus className="h-4 w-4 mr-1" />Nuevo negocio
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {businesses.map((b) => (
              <Card key={b.id} className="flex flex-col">
                <CardContent className="p-4 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{b.name}</h3>
                      <p className="text-xs text-muted-foreground">/{b.slug}</p>
                    </div>
                    {b.license && (
                      <Badge variant={b.license.active && new Date(b.license.endDate) > new Date() ? 'default' : 'destructive'}>
                        {b.license.active && new Date(b.license.endDate) > new Date() ? 'ACTIVO' : 'EXPIRADO'}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>📦 {b.category.name}</div>
                    <div>👤 {b.owner.name} (@{b.owner.username})</div>
                    <div>💅 {b._count?.services || 0} servicios · {b._count?.appointments || 0} citas</div>
                    {b.license && (
                      <div className="flex items-center gap-1">
                        <CalIcon className="h-3 w-3" />
                        Vence: {new Date(b.license.endDate).toLocaleDateString('es-ES')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/negocio/${b.slug}`)}
                    >
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/negocio/${b.slug}/panel`)}
                    >
                      Panel
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteBusiness(b.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* DUEÑOS */}
        <TabsContent value="owners" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{owners.length} dueños</h2>
            <Button onClick={() => setShowOwnerForm(true)}>
              <Plus className="h-4 w-4 mr-1" />Nuevo dueño
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {owners.map((o) => (
              <Card key={o.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{o.name}</h3>
                      <p className="text-xs text-muted-foreground">@{o.username}</p>
                    </div>
                    <Badge variant="secondary">{o._count?.businesses || 0} negocios</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {o.email && <div>✉️ {o.email}</div>}
                    {o.phone && <div>📞 {o.phone}</div>}
                    <div>📅 {new Date(o.createdAt).toLocaleDateString('es-ES')}</div>
                  </div>
                  <Button size="sm" variant="ghost" className="w-full text-destructive" onClick={() => deleteOwner(o.id)}>
                    <Trash2 className="h-4 w-4 mr-1" />Eliminar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* LICENCIAS */}
        <TabsContent value="licenses" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{licenses.length} licencias</h2>
            <Button onClick={() => setShowLicForm(true)}>
              <Plus className="h-4 w-4 mr-1" />Extender licencia
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left p-3 font-medium">Negocio</th>
                      <th className="text-left p-3 font-medium">Inicio</th>
                      <th className="text-left p-3 font-medium">Fin</th>
                      <th className="text-center p-3 font-medium">Duración</th>
                      <th className="text-center p-3 font-medium">Estado</th>
                      <th className="text-center p-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licenses.map((l) => {
                      const expired = new Date(l.endDate) < new Date()
                      const isExpiring = !expired && (new Date(l.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 7
                      return (
                        <tr key={l.id} className="border-b hover:bg-muted/30">
                          <td className="p-3">
                            <div className="font-medium">{l.business.name}</div>
                            <div className="text-xs text-muted-foreground">/{l.business.slug}</div>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(l.startDate).toLocaleDateString('es-ES')}
                          </td>
                          <td className="p-3">
                            <div>{new Date(l.endDate).toLocaleDateString('es-ES')}</div>
                            {expired && <div className="text-xs text-red-600">Expirada</div>}
                            {isExpiring && <div className="text-xs text-amber-600">Próxima a expirar</div>}
                          </td>
                          <td className="p-3 text-center">{l.durationDays}d</td>
                          <td className="p-3 text-center">
                            {l.active ? (
                              <Badge variant="default" className="bg-green-600">Activa</Badge>
                            ) : (
                              <Badge variant="destructive">Inactiva</Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setLicForm({ businessId: l.businessId, addDays: '30' })
                                  setShowLicForm(true)
                                }}
                              >
                                +Días
                              </Button>
                              {l.active ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleLicense(l.businessId, 'deactivate')}
                                >
                                  Desactivar
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleLicense(l.businessId, 'activate')}
                                >
                                  Activar
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: crear dueño */}
      <Dialog open={showOwnerForm} onOpenChange={setShowOwnerForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear dueño de negocio</DialogTitle>
            <DialogDescription>
              El dueño podrá luego acceder con su usuario/contraseña al panel de gestión
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input value={ownerForm.name} onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Usuario *</Label>
                <Input value={ownerForm.username} onChange={(e) => setOwnerForm({ ...ownerForm, username: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Contraseña *</Label>
                <Input value={ownerForm.password} onChange={(e) => setOwnerForm({ ...ownerForm, password: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono/WhatsApp</Label>
                <Input value={ownerForm.phone} onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={ownerForm.email} onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOwnerForm(false)}>Cancelar</Button>
            <Button onClick={createOwner}>Crear dueño</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: crear negocio */}
      <Dialog open={showBizForm} onOpenChange={setShowBizForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear negocio</DialogTitle>
            <DialogDescription>
              Asigna un dueño y una categoría. Se generará licencia inicial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input value={bizForm.name} onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Slug (URL) *</Label>
                <Input
                  value={bizForm.slug}
                  onChange={(e) => setBizForm({ ...bizForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="mi-negocio"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input value={bizForm.description} onChange={(e) => setBizForm({ ...bizForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dueño *</Label>
                <Select value={bizForm.ownerId} onValueChange={(v) => setBizForm({ ...bizForm, ownerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {owners.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name} (@{o.username})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoría *</Label>
                <Select value={bizForm.categoryId} onValueChange={(v) => setBizForm({ ...bizForm, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dirección</Label>
                <Input value={bizForm.address} onChange={(e) => setBizForm({ ...bizForm, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input value={bizForm.phone} onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Licencia inicial (días)</Label>
              <Input type="number" value={bizForm.licenseDays} onChange={(e) => setBizForm({ ...bizForm, licenseDays: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBizForm(false)}>Cancelar</Button>
            <Button onClick={createBusiness}>Crear negocio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: extender licencia */}
      <Dialog open={showLicForm} onOpenChange={setShowLicForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extender licencia</DialogTitle>
            <DialogDescription>
              Añade días a la licencia del negocio seleccionado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Negocio</Label>
              <Select value={licForm.businessId} onValueChange={(v) => setLicForm({ ...licForm, businessId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Días a añadir</Label>
              <Input type="number" value={licForm.addDays} onChange={(e) => setLicForm({ ...licForm, addDays: e.target.value })} />
            </div>
            <div className="flex gap-2">
              {[7, 15, 30, 60, 90].map((d) => (
                <Button key={d} variant="outline" size="sm" onClick={() => setLicForm({ ...licForm, addDays: String(d) })}>
                  +{d}d
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLicForm(false)}>Cancelar</Button>
            <Button onClick={extendLicense}>Extender</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
