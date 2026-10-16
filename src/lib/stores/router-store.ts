'use client'

import { create } from 'zustand'

export interface Route {
  path: string
  params: Record<string, string>
}

// Router SPA basado en hash:
//   #/                         -> catalogo
//   #/negocio/[slug]           -> vista publica de negocio
//   #/negocio/[slug]/panel     -> panel del dueño
//   #/admin                    -> panel admin
//   #/login                    -> login
interface RouterState {
  route: Route
  navigate: (path: string) => void
  back: () => void
}

function parseHash(hash: string): Route {
  const clean = hash.replace(/^#/, '').replace(/^\//, '')
  if (!clean) return { path: '/', params: {} }
  return { path: '/' + clean, params: {} }
}

export const useRouterStore = create<RouterState>((set, get) => ({
  route: parseHash(typeof window !== 'undefined' ? window.location.hash : ''),
  navigate: (path) => {
    const hashPath = '#' + path
    if (typeof window !== 'undefined') {
      window.location.hash = hashPath
    }
    set({ route: parseHash(hashPath) })
    // scroll to top on navigation
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  },
  back: () => {
    if (typeof window !== 'undefined') {
      window.history.back()
    }
  },
}))

// Hook para suscribirse a cambios del hash (en el _app level)
export function initRouter() {
  if (typeof window === 'undefined') return
  const handler = () => {
    useRouterStore.setState({ route: parseHash(window.location.hash) })
  }
  window.addEventListener('hashchange', handler)
  // Hash inicial
  if (!window.location.hash) {
    window.location.hash = '#/'
  }
}

// Helpers de matching de rutas
export function matchRoute(path: string): {
  name:
    | 'catalog'
    | 'business'
    | 'business-panel'
    | 'admin'
    | 'login'
    | 'register'
    | 'create-business'
  slug?: string
} {
  if (path === '/' || path === '') return { name: 'catalog' }
  if (path === '/admin') return { name: 'admin' }
  if (path === '/login') return { name: 'login' }
  if (path === '/register') return { name: 'register' }
  if (path === '/crear-negocio') return { name: 'create-business' }
  const bizMatch = path.match(/^\/negocio\/([^/]+)$/)
  if (bizMatch) return { name: 'business', slug: bizMatch[1] }
  const panelMatch = path.match(/^\/negocio\/([^/]+)\/panel$/)
  if (panelMatch) return { name: 'business-panel', slug: panelMatch[1] }
  return { name: 'catalog' }
}
