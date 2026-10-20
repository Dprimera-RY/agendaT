'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { CalendarCheck, Menu, LayoutDashboard, FileText, Download, RefreshCw } from 'lucide-react'
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'

// Evento nativo de instalación PWA (beforeinstallprompt)
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function AppShell({ children }: { children: ReactNode }) {
  const { navigate, route } = useRouterStore()
  const { session, logout } = useAuth()
  // Registrar el service worker de notificaciones push (solo en el cliente)
  useServiceWorker()
  const [menuOpen, setMenuOpen] = useState(false)
  // PWA: botón "Instalar app" cuando el navegador lo permite
  const [installEvt, setInstallEvt] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvt(e as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installEvt) return
    try {
      await installEvt.prompt()
    } finally {
      setInstallEvt(null)
    }
  }

  const isOnAdmin = route.path.startsWith('/admin')
  const isOnPanel = route.path.includes('/panel')
  const [refreshing, setRefreshing] = useState(false)

  // Limpiar caché del dispositivo y recargar todo desde el servidor
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
      // Limpiar localStorage menos la sesión y preferencias persistidas
      const keep = ['agenda_session', 'agenda_province', 'agenda_catalog', 'agenda_hash']
      const toRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && !keep.includes(k)) toRemove.push(k)
      }
      toRemove.forEach((k) => localStorage.removeItem(k))
    } catch {}
    // Recarga dura que ignora la caché HTTP del navegador
    window.location.reload()
  }

  // Navegar cerrando el sidebar móvil
  const go = (path: string) => {
    setMenuOpen(false)
    navigate(path)
  }

  // Acciones de la barra superior: en desktop van inline en el header,
  // en móvil dentro del sidebar (Sheet) abierto por el botón de menú.
  const actions = (vertical: boolean) => (
    <>
      {installEvt && (
        <Button
          variant={isOnPanel || isOnAdmin ? 'ghost' : 'outline'}
          size="sm"
          onClick={handleInstall}
        >
          <Download className="h-4 w-4 mr-1" />
          Instalar app
        </Button>
      )}
      {!session.role && (
        <Button
          variant={route.path === '/mis-citas' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => go('/mis-citas')}
        >
          <CalendarCheck className="h-4 w-4 mr-1" />
          Mis citas
        </Button>
      )}

      {session.role === 'owner' && (
        vertical ? (
          // Sidebar móvil: panel + todos los negocios + crear
          <div className="flex flex-col gap-1.5 w-full">
            <span className="text-xs text-muted-foreground px-1 pt-1">Mis negocios</span>
            {session.businesses && session.businesses.length > 0 ? (
              session.businesses.map((b) => (
                <Button
                  key={b.id}
                  variant={isOnPanel && route.path.includes(`/${b.slug}/`) ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => go(`/negocio/${b.slug}/panel`)}
                  className="truncate"
                >
                  <LayoutDashboard className="h-4 w-4 mr-1 shrink-0" />
                  {b.name}
                </Button>
              ))
            ) : (
              <Button
                variant={isOnPanel ? 'default' : 'ghost'}
                size="sm"
                onClick={() => go('/crear-negocio')}
              >
                <LayoutDashboard className="h-4 w-4 mr-1" />
                Ir a mi panel
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => go('/crear-negocio')}
            >
              + Crear otro negocio
            </Button>
          </div>
        ) : session.businesses && session.businesses.length > 0 ? (
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
                  onClick={() => go(`/negocio/${b.slug}/panel`)}
                  className="cursor-pointer flex flex-col items-start"
                >
                  <span className="font-medium">{b.name}</span>
                  <span className="text-xs text-muted-foreground">/{b.slug}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => go('/crear-negocio')}
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
            onClick={() => go('/crear-negocio')}
          >
            Mi Panel
          </Button>
        )
      )}

      {session.role === 'admin' && (
        <Button
          variant={isOnAdmin ? 'default' : 'ghost'}
          size="sm"
          onClick={() => go('/admin')}
        >
          Admin
        </Button>
      )}

      {session.role && !vertical && (
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
      )}
      {!session.role && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => go('/register')}
          >
            Registrarse
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => go('/login')}
          >
            Iniciar sesión
          </Button>
        </>
      )}
    </>
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => go('/')}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <img src={"/logo.png"} width={"50"} height={"50"} alt="AgendaT" />
            {/* Texto de marca: siempre visible; subtítulo solo en pantallas sm+ */}
            <div className="flex flex-col items-start">
              <span className="font-bold text-lg leading-none tracking-tight">
                AgendaT
              </span>
              <span className="hidden sm:block text-[10px] text-muted-foreground leading-none mt-0.5">
                Citas Multi-Negocio
              </span>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {/* Botón refrescar: siempre visible, limpia caché y recarga */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refrescar datos"
              title="Limpiar caché y recargar"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            {/* Acciones inline solo en desktop */}
            <nav className="hidden items-center gap-2 sm:flex">{actions(false)}</nav>
            {/* Botón de menú: siempre visible en móvil, abre el sidebar */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:hidden"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 sm:max-w-sm flex flex-col">
                <SheetHeader className="border-b border-border pb-4">
                  {session.role ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {session.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <SheetTitle className="truncate text-base">{session.name}</SheetTitle>
                        <p className="text-xs text-muted-foreground truncate">
                          {session.role === 'admin' ? 'Administrador' : 'Dueño'} · @{session.username}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <SheetTitle className="flex items-center gap-2">
                      <img src={"/logo.png"} width={"28"} height={"28"} alt="" />
                      AgendaT
                    </SheetTitle>
                  )}
                </SheetHeader>
                <div className="flex-1 flex flex-col gap-2 overflow-y-auto px-4 [&_button]:w-full [&_button]:justify-start">
                  {actions(true)}
                </div>
                {session.role && (
                  <div className="border-t border-border px-4 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-destructive hover:text-destructive"
                      onClick={() => {
                        setMenuOpen(false)
                        logout()
                        navigate('/')
                      }}
                    >
                      Cerrar sesión
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border mt-auto bg-muted/30">
        <div
          className={`container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground ${
            isOnPanel || isOnAdmin ? 'pt-6 pb-24 sm:pb-6' : 'py-6'
          }`}
        >
          <span>© {new Date().getFullYear()} AgendaT — Plataforma de citas multi-negocio</span>
          <button
            onClick={() => navigate('/terminos')}
            className="inline-flex items-center gap-1 hover:text-primary underline underline-offset-2"
          >
            <FileText className="h-3.5 w-3.5" />
            Términos, Condiciones y Uso de Datos
          </button>
          <span>Desarrollado por <b>rycode</b> D'Primera RY</span>
        </div>
      </footer>
    </div>
  )
}
