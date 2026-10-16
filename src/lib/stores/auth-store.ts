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
  loginAdmin: (username: string, password: string) => Promise<boolean>
  loginOwner: (username: string, password: string) => Promise<boolean>
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
  loginAdmin: async (username, password) => {
    const res = await fetch('/api/auth/login-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) return false
    const data = await res.json()
    // Volver a cargar businesses
    const meRes = await fetch('/api/auth/me')
    const meData = await meRes.json()
    set({ session: meData })
    return true
  },
  loginOwner: async (username, password) => {
    const res = await fetch('/api/auth/login-owner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) return false
    const data = await res.json()
    const meRes = await fetch('/api/auth/me')
    const meData = await meRes.json()
    set({ session: meData })
    return true
  },
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    set({ session: { role: null } })
  },
}))
