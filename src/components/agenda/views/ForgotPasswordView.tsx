'use client'

import { useState } from 'react'
import { ArrowLeft, KeyRound, Mail, RefreshCw, Send } from 'lucide-react'
import { useRouterStore } from '@/lib/stores/router-store'
import { useAuth } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { toast } from 'sonner'

// Recuperación de contraseña con código OTP por email (2 pasos).
export function ForgotPasswordView() {
  const { navigate } = useRouterStore()
  const { forgotPassword, resetPassword, resendOtp } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const startCooldown = () => {
    setCooldown(60)
    const tick = () => {
      setCooldown((c) => {
        if (c <= 1) return 0
        setTimeout(tick, 1000)
        return c - 1
      })
    }
    setTimeout(tick, 1000)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error('Email inválido')
      return
    }
    setLoading(true)
    const result = await forgotPassword(email.trim())
    setLoading(false)
    if (!result.ok) {
      toast.error(result.error || 'No se pudo procesar la solicitud')
      return
    }
    setStep(2)
    startCooldown()
    toast.success('Si existe una cuenta con ese email, te enviamos un código', {
      description: result.sent
        ? 'Revisa tu bandeja de entrada (y spam).'
        : 'El correo no pudo enviarse: contacta con el administrador.',
    })
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().length !== 6) {
      toast.error('Introduce el código de 6 dígitos')
      return
    }
    if (password.length < 4) {
      toast.error('La contraseña debe tener al menos 4 caracteres')
      return
    }
    setLoading(true)
    const result = await resetPassword(email.trim(), code.trim(), password)
    setLoading(false)
    if (!result.ok) {
      toast.error(result.error || 'No se pudo restablecer la contraseña')
      return
    }
    toast.success('Contraseña actualizada. Bienvenido/a de nuevo.')
    navigate(result.redirect || '/')
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setCooldown(60)
    const result = await resendOtp(email.trim(), 'reset')
    if (!result.ok) {
      toast.error(result.error || 'No se pudo reenviar')
      return
    }
    toast.success(result.sent ? 'Código reenviado a tu email' : 'Solicitud registrada')
    const tick = () => {
      setCooldown((c) => {
        if (c <= 1) return 0
        setTimeout(tick, 1000)
        return c - 1
      })
    }
    setTimeout(tick, 1000)
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
            <KeyRound className="h-5 w-5 text-primary" />
            {step === 1 ? 'Olvidé mi contraseña' : 'Restablecer contraseña'}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? 'Te enviaremos un código de 6 dígitos a tu email para verificar tu identidad'
              : 'Introduce el código recibido y tu nueva contraseña'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="femail">Email de tu cuenta</Label>
                <Input
                  id="femail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Enviando...' : 'Enviar código'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Código de verificación</Label>
                <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="npwd">Nueva contraseña</Label>
                <Input
                  id="npwd"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <KeyRound className="h-4 w-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </Button>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-primary"
                  onClick={handleResend}
                  disabled={cooldown > 0}
                >
                  <RefreshCw className="h-3 w-3 inline mr-1" />
                  {cooldown > 0 ? `Reenviar (${cooldown}s)` : 'Reenviar código'}
                </button>
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-primary"
                  onClick={() => setStep(1)}
                >
                  <Mail className="h-3 w-3 inline mr-1" />
                  Cambiar de email
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
