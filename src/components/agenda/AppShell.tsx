'use client'

import { type ReactNode } from 'react'
import { Calendar, CalendarCheck } from 'lucide-react'
import { useRouterStore } from '@/lib/stores/router-store'
import { useAuth } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { useServiceWorker } from '@/components/agenda/PushRegistrar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

export function AppShell({ children }: { children: ReactNode }) {
  const { navigate, route } = useRouterStore()
  const { session, logout } = useAuth()
  // Registrar el service worker de notificaciones push (solo en el cliente)
  useServiceWorker()

  const isOnAdmin = route.path.startsWith('/admin')
  const isOnPanel = route.path.includes('/panel')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-bold text-lg leading-none tracking-tight">
                AgendaPro
              </span>
              <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                Citas Multi-Negocio
              </span>
            </div>
          </button>

          <nav className="flex items-center gap-2">
            {!session.role && (
              <Button
                variant={route.path === '/mis-citas' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/mis-citas')}
              >
                <CalendarCheck className="h-4 w-4 mr-1 sm:mr-1" />
                <span className="hidden sm:inline">Mis citas</span>
              </Button>
            )}

            {session.role === 'owner' && (
              session.businesses && session.businesses.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant={isOnPanel ? 'default' : 'ghost'} size="sm">
                      Mi Panel
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Mis negocios</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {session.businesses.map((b) => (
                      <DropdownMenuItem
                        key={b.id}
                        onClick={() => navigate(`/negocio/${b.slug}/panel`)}
                        className="cursor-pointer flex flex-col items-start"
                      >
                        <span className="font-medium">{b.name}</span>
                        <span className="text-xs text-muted-foreground">/{b.slug}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => navigate('/crear-negocio')}
                      className="cursor-pointer text-primary"
                    >
                      + Crear otro negocio
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant={isOnPanel ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigate('/crear-negocio')}
                >
                  Mi Panel
                </Button>
              )
            )}

            {session.role === 'admin' && (
              <Button
                variant={isOnAdmin ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/admin')}
              >
                Admin
              </Button>
            )}

            {session.role ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Badge variant="outline" className="mr-2 capitalize">
                      {session.role === 'admin' ? 'ROOT' : 'Dueño'}
                    </Badge>
                    {session.name}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{session.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => {
                      logout()
                      navigate('/')
                    }}
                  >
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/register')}
                >
                  Registrarse
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/login')}
                >
                  Iniciar sesión
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border mt-auto bg-muted/30">
        <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} AgendaPro — Plataforma de citas multi-negocio</span>
          <span>Desarrollado por <b>rycode</b> D'Primera RY</span>
        </div>
      </footer>
    </div>
  )
}
