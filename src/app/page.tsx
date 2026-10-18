'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/lib/stores/auth-store'
import { initRouter, matchRoute, useRouterStore } from '@/lib/stores/router-store'
import { CatalogView } from '@/components/agenda/views/CatalogView'
import { BusinessView } from '@/components/agenda/views/BusinessView'
import { BusinessPanel } from '@/components/agenda/views/BusinessPanel'
import { AdminPanel } from '@/components/agenda/views/AdminPanel'
import { LoginView } from '@/components/agenda/views/LoginView'
import { RegisterView } from '@/components/agenda/views/RegisterView'
import { CreateBusinessView } from '@/components/agenda/views/CreateBusinessView'
import { MisCitasView } from '@/components/agenda/views/MisCitasView'
import { VerifyEmailView } from '@/components/agenda/views/VerifyEmailView'
import { ForgotPasswordView } from '@/components/agenda/views/ForgotPasswordView'
import { TermsView } from '@/components/agenda/views/TermsView'
import { AppShell } from '@/components/agenda/AppShell'

export default function HomePage() {
  const { route } = useRouterStore()
  const { fetchMe, loading } = useAuth()
  // El overlay de carga NUNCA se renderiza en el HTML del servidor:
  // si el JS falla o tarda, el usuario ve el contenido (no un spinner eterno).
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // setTimeout: montaje diferido (evita setState síncrono en el effect)
    const t = setTimeout(() => setMounted(true), 0)
    initRouter()
    fetchMe()
    return () => clearTimeout(t)
  }, [fetchMe])

  const matched = matchRoute(route.path)

  let content: ReactNode = null
  if (matched.name === 'catalog') {
    content = <CatalogView />
  } else if (matched.name === 'business' && matched.slug) {
    content = <BusinessView slug={matched.slug} />
  } else if (matched.name === 'business-panel' && matched.slug) {
    content = <BusinessPanel slug={matched.slug} />
  } else if (matched.name === 'admin') {
    content = <AdminPanel />
  } else if (matched.name === 'login') {
    content = <LoginView />
  } else if (matched.name === 'register') {
    content = <RegisterView />
  } else if (matched.name === 'create-business') {
    content = <CreateBusinessView />
  } else if (matched.name === 'mis-citas') {
    content = <MisCitasView />
  } else if (matched.name === 'verify-email') {
    content = <VerifyEmailView />
  } else if (matched.name === 'forgot-password') {
    content = <ForgotPasswordView />
  } else if (matched.name === 'terminos') {
    content = <TermsView />
  } else {
    content = <CatalogView />
  }

  return (
    <AppShell>
      {mounted && loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}
      {content}
    </AppShell>
  )
}
