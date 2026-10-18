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

export interface AuthResult {
  ok: boolean
  redirect?: string
  role?: string
  error?: string
  needsVerification?: boolean
  email?: string
  sent?: boolean
}

interface AuthState {
  session: Session
  loading: boolean
  setSession: (s: Session) => void
  setLoading: (b: boolean) => void
  fetchMe: () => Promise<void>
  // Login unificado: detecta rol automáticamente
  login: (username: string, password: string) => Promise<AuthResult>
  // Registro de nuevo dueño (requiere verificación OTP por email)
  register: (data: {
    name: string
    username: string
    password: string
    email: string
    phone?: string
    terms: boolean
  }) => Promise<AuthResult>
  // Verificación OTP: activa la cuenta y crea la sesión
  verifyEmail: (email: string, code: string) => Promise<AuthResult>
  resendOtp: (email: string, purpose?: 'register' | 'reset') => Promise<AuthResult>
  forgotPassword: (email: string) => Promise<AuthResult>
  resetPassword: (email: string, code: string, password: string) => Promise<AuthResult>
  logout: () => Promise<void>
}

// Sincroniza el estado local con la cookie de sesión del servidor
async function syncSession(set: (s: Partial<AuthState>) => void) {
  try {
    const meRes = await fetch('/api/auth/me')
    set({ session: await meRes.json() })
  } catch {
    // sin sesión
  }
}

export const useAuth = create<AuthState>((set) => ({
  session: { role: null },
  loading: true,
  setSession: (s) => set({ session: s }),
  setLoading: (b) => set({ loading: b }),
  fetchMe: async () => {
    try {
      // Timeout: en móviles por red el fetch puede colgar; nunca dejar loading=true
      const res = await fetch('/api/auth/me', { signal: AbortSignal.timeout(10000) })
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
        return {
          ok: false,
          error: data.error,
          needsVerification: data.needsVerification,
          email: data.email,
        }
      }
      await syncSession(set)
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
        return { ok: false, error: result.error }
      }
      if (result.needsVerification) {
        return { ok: true, needsVerification: true, email: result.email, sent: result.sent }
      }
      await syncSession(set)
      return { ok: true, redirect: result.redirect }
    } catch {
      return { ok: false }
    }
  },
  verifyEmail: async (email, code) => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error }
      await syncSession(set)
      return { ok: true, redirect: data.redirect, role: data.role }
    } catch {
      return { ok: false }
    }
  },
  resendOtp: async (email, purpose = 'register') => {
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error }
      return { ok: true, sent: data.sent }
    } catch {
      return { ok: false }
    }
  },
  forgotPassword: async (email) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error }
      return { ok: true, sent: data.sent }
    } catch {
      return { ok: false }
    }
  },
  resetPassword: async (email, code, password) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error }
      await syncSession(set)
      return { ok: true, redirect: data.redirect }
    } catch {
      return { ok: false }
    }
  },
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    set({ session: { role: null } })
  },
}))
