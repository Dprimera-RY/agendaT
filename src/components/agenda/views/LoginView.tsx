'use client'

import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { useRouterStore } from '@/lib/stores/router-store'
import { useAuth } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export function LoginView() {
  const { navigate } = useRouterStore()
  const { login } = useAuth()
  const [showPwd, setShowPwd] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      toast.error('Completa todos los campos')
      return
    }
    setLoading(true)
    const result = await login(username, password)
    setLoading(false)

    if (!result.ok) {
      if (result.needsVerification) {
        if (result.email) sessionStorage.setItem('agenda_verify_email', result.email)
        toast.error(result.error || 'Tu correo no está verificado')
        navigate('/verificar-email')
        return
      }
      toast.error(result.error || 'Usuario o contraseña incorrectos')
      return
    }
    toast.success(`Bienvenido/a!`)
    // Redirección automática según el rol
    if (result.redirect) {
      navigate(result.redirect)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="-ml-2 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Volver al catálogo
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-primary" />
            Iniciar sesión
          </CardTitle>
          <CardDescription>
            Accede a tu panel de gestión de negocio o al panel de administración
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tu_usuario"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
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
            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center space-y-2">
            <p className="text-sm text-muted-foreground">¿Aún no tienes cuenta?</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/register')}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Crear cuenta nueva
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
