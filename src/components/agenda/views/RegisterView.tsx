'use client'

import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, UserPlus, Check } from 'lucide-react'
import { useRouterStore } from '@/lib/stores/router-store'
import { useAuth } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export function RegisterView() {
  const { navigate } = useRouterStore()
  const { register } = useAuth()
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.username || !form.password) {
      toast.error('Nombre, usuario y contraseña son obligatorios')
      return
    }
    if (form.password.length < 4) {
      toast.error('La contraseña debe tener al menos 4 caracteres')
      return
    }
    setLoading(true)
    const result = await register(form)
    setLoading(false)

    if (!result.ok) {
      toast.error('No se pudo registrar. Es posible que el usuario ya exista.')
      return
    }
    toast.success('¡Cuenta creada! Ahora crea tu negocio.')
    // El redirect va a /crear-negocio
    if (result.redirect) {
      navigate(result.redirect)
    } else {
      navigate('/crear-negocio')
    }
  }

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 20)

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="-ml-2 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Volver a iniciar sesión
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Crear cuenta de dueño
          </CardTitle>
          <CardDescription>
            Regístrate como dueño de negocio para empezar a gestionar tus citas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre completo *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Laura Méndez"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Usuario *</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) =>
                  setForm({ ...form, username: slugify(e.target.value) || e.target.value.toLowerCase().replace(/\s+/g, '') })
                }
                placeholder="ej. laura_mendez"
              />
              <p className="text-xs text-muted-foreground">
                Letras minúsculas y números, sin espacios
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 4 caracteres"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => setShowPwd((s) => !s)}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">WhatsApp / Teléfono</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+53 5xxx xxxx"
              />
              <p className="text-xs text-muted-foreground">
                Recibirás aquí las notificaciones de nuevas citas
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tu@email.com"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-primary hover:underline font-medium"
            >
              Inicia sesión
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Beneficios */}
      <Card className="mt-4 bg-primary/5 border-primary/20">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-medium text-primary">Al registrarte obtienes:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Página pública de tu negocio
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Calendario de citas con vista Día/Semana/Mes
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              Notificaciones WhatsApp de nuevas reservas
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              30 días de prueba gratis
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
