'use client'

import { useState } from 'react'
import { ShieldCheck, User as UserIcon, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useRouterStore } from '@/lib/stores/router-store'
import { useAuth } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

export function LoginView() {
  const { navigate } = useRouterStore()
  const { loginAdmin, loginOwner } = useAuth()
  const [showPwd, setShowPwd] = useState(false)
  const [tab, setTab] = useState<'owner' | 'admin'>('owner')

  const [ownerUser, setOwnerUser] = useState('')
  const [ownerPwd, setOwnerPwd] = useState('')
  const [adminUser, setAdminUser] = useState('')
  const [adminPwd, setAdminPwd] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOwner = async () => {
    if (!ownerUser || !ownerPwd) {
      toast.error('Completa todos los campos')
      return
    }
    setLoading(true)
    const ok = await loginOwner(ownerUser, ownerPwd)
    setLoading(false)
    if (ok) {
      toast.success('Sesión iniciada')
      navigate('/')
    } else {
      toast.error('Credenciales inválidas')
    }
  }

  const handleAdmin = async () => {
    if (!adminUser || !adminPwd) {
      toast.error('Completa todos los campos')
      return
    }
    setLoading(true)
    const ok = await loginAdmin(adminUser, adminPwd)
    setLoading(false)
    if (ok) {
      toast.success('Bienvenido, administrador')
      navigate('/admin')
    } else {
      toast.error('Credenciales inválidas')
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="-ml-2 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />Volver al catálogo
      </Button>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'owner' | 'admin')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="owner">
            <UserIcon className="h-4 w-4 mr-1" />
            Dueño de negocio
          </TabsTrigger>
          <TabsTrigger value="admin">
            <ShieldCheck className="h-4 w-4 mr-1" />
            Administrador
          </TabsTrigger>
        </TabsList>

        <TabsContent value="owner">
          <Card>
            <CardHeader>
              <CardTitle>Iniciar sesión</CardTitle>
              <CardDescription>Accede al panel de gestión de tu negocio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ou">Usuario</Label>
                <Input id="ou" value={ownerUser} onChange={(e) => setOwnerUser(e.target.value)} placeholder="usuario_negocio" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="op">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="op"
                    type={showPwd ? 'text' : 'password'}
                    value={ownerPwd}
                    onChange={(e) => setOwnerPwd(e.target.value)}
                    placeholder="••••••"
                    onKeyDown={(e) => e.key === 'Enter' && handleOwner()}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-7 w-7 p-0"
                    onClick={() => setShowPwd((s) => !s)}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button className="w-full" onClick={handleOwner} disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>

              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <p className="font-medium">Usuarios de prueba:</p>
                <p>• <code className="bg-muted px-1 rounded">estudio_aura / aura123</code></p>
                <p>• <code className="bg-muted px-1 rounded">kings_barber / kings123</code></p>
                <p>• <code className="bg-muted px-1 rounded">glamour_hair / glamour123</code></p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Acceso Root
              </CardTitle>
              <CardDescription>Panel de administración del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="au">Usuario root</Label>
                <Input id="au" value={adminUser} onChange={(e) => setAdminUser(e.target.value)} placeholder="root" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ap">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="ap"
                    type={showPwd ? 'text' : 'password'}
                    value={adminPwd}
                    onChange={(e) => setAdminPwd(e.target.value)}
                    placeholder="•••"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdmin()}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-7 w-7 p-0"
                    onClick={() => setShowPwd((s) => !s)}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button className="w-full" onClick={handleAdmin} disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar como root'}
              </Button>
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Usuario por defecto: <code className="bg-muted px-1 rounded">root / 123</code>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
