'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react'
import { useRouterStore } from '@/lib/stores/router-store'
import { useAuth } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { toast } from 'sonner'

// Verificación de identidad por código OTP enviado al email.
// Se llega aquí tras registrarse o cuando el login detecta cuenta sin verificar.
export function VerifyEmailView() {
  const { navigate } = useRouterStore()
  const { verifyEmail, resendOtp } = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    // setTimeout: montaje diferido (evita setState síncrono en el effect)
    const t = setTimeout(() => {
      const pending = sessionStorage.getItem('agenda_verify_email')
      if (pending) setEmail(pending)
    }, 0)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error('Email inválido')
      return
    }
    if (code.trim().length !== 6) {
      toast.error('Introduce el código de 6 dígitos')
      return
    }
    setLoading(true)
    const result = await verifyEmail(email.trim(), code.trim())
    setLoading(false)
    if (!result.ok) {
      toast.error(result.error || 'Código incorrecto')
      return
    }
    sessionStorage.removeItem('agenda_verify_email')
    toast.success('¡Email verificado! Tu cuenta está activa.')
    navigate(result.redirect || '/')
  }

  const handleResend = async () => {
    if (cooldown > 0 || resending) return
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error('Indica primero tu email')
      return
    }
    setResending(true)
    const result = await resendOtp(email.trim(), 'register')
    setResending(false)
    if (!result.ok) {
      toast.error(result.error || 'No se pudo reenviar el código')
      return
    }
    setCooldown(60)
    toast.success(result.sent ? 'Código reenviado a tu email' : 'Solicitud registrada', {
      description: result.sent
        ? 'Revisa tu bandeja de entrada (y spam).'
        : 'Si el correo no llega, pide verificación al administrador.',
    })
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="-ml-2 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Volver a iniciar sesión
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Verifica tu email
          </CardTitle>
          <CardDescription>
            Para proteger tu identidad, tu cuenta se activa cuando introduzcas el código de 6
            dígitos que te enviamos por email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="vemail">Email</Label>
              <Input
                id="vemail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Código de verificación</Label>
              <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <p className="text-xs text-muted-foreground">
                Caduca a los 15 minutos. Revisa también la carpeta de spam.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
              <MailCheck className="h-4 w-4 mr-2" />
              {loading ? 'Verificando...' : 'Verificar y entrar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {cooldown > 0
                ? `Reenviar código (${cooldown}s)`
                : resending
                  ? 'Reenviando...'
                  : 'Reenviar código'}
            </Button>
          </form>

          <p className="mt-4 text-xs text-muted-foreground text-center">
            ¿No tienes acceso a ese email?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-primary underline underline-offset-2"
            >
              Vuelve al login
            </button>{' '}
            o pide verificación manual al administrador.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
