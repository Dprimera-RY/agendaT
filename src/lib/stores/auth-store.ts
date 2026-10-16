'use client'

import { create } from 'zustand'

export interface Session {
  role: 'admin' | 'owner' | null
  adminId?: string
  ownerId?: string
  name?: string
  username?: string
  businesses?: Array<{ id: string; slug: string; name: string }>
}

interface AuthState {
  session: Session
  loading: boolean
  setSession: (s: Session) => void
  setLoading: (b: boolean) => void
  fetchMe: () => Promise<void>
  // Login unificado: detecta rol automáticamente
  login: (username: string, password: string) => Promise<{ ok: boolean; redirect?: string; role?: string }>
  // Registro de nuevo dueño
  register: (data: {
    name: string
    username: string
    password: string
    email?: string
    phone?: string
  }) => Promise<{ ok: boolean; redirect?: string }>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  session: { role: null },
  loading: true,
  setSession: (s) => set({ session: s }),
  setLoading: (b) => set({ loading: b }),
  fetchMe: async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      set({ session: data, loading: false })
    } catch {
      set({ session: { role: null }, loading: false })
    }
  },
  login: async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { ok: false }
      }
      // Volver a cargar la sesión completa (incluye businesses)
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      set({ session: meData })
      return { ok: true, redirect: data.redirect, role: data.role }
    } catch {
      return { ok: false }
    }
  },
  register: async (data) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) {
        return { ok: false }
      }
      // El backend ya hizo setSession, ahora sincronizamos el frontend
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      set({ session: meData })
      return { ok: true, redirect: result.redirect }
    } catch {
      return { ok: false }
    }
  },
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    set({ session: { role: null } })
  },
}))
