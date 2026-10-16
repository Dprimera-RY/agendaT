'use client'

import { useEffect, type ReactNode } from 'react'
import { useAuth } from '@/lib/stores/auth-store'
import { initRouter, matchRoute, useRouterStore } from '@/lib/stores/router-store'
import { CatalogView } from '@/components/agenda/views/CatalogView'
import { BusinessView } from '@/components/agenda/views/BusinessView'
import { BusinessPanel } from '@/components/agenda/views/BusinessPanel'
import { AdminPanel } from '@/components/agenda/views/AdminPanel'
import { LoginView } from '@/components/agenda/views/LoginView'
import { RegisterView } from '@/components/agenda/views/RegisterView'
import { CreateBusinessView } from '@/components/agenda/views/CreateBusinessView'
import { AppShell } from '@/components/agenda/AppShell'

export default function HomePage() {
  const { route } = useRouterStore()
  const { fetchMe, loading } = useAuth()

  useEffect(() => {
    initRouter()
    fetchMe()
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
  } else {
    content = <CatalogView />
  }

  return (
    <AppShell>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}
      {content}
    </AppShell>
  )
}
