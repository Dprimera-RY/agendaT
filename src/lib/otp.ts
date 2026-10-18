import { db } from '@/lib/db'

// Códigos OTP de 6 dígitos para verificar la identidad por email
// (registro de dueños y recuperación de contraseña). Expiran en 15 min.

const TTL_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

export type OtpPurpose = 'register' | 'reset'

export async function createOtp(email: string, purpose: OtpPurpose, ownerId?: string) {
  // Invalida los códigos anteriores sin usar del mismo destinatario
  await db.emailOtp.updateMany({
    where: { email, purpose, ...(ownerId ? { ownerId } : {}), consumed: false },
    data: { consumed: true },
  })
  const code = String(Math.floor(100000 + Math.random() * 900000))
  return db.emailOtp.create({
    data: { email, code, purpose, ownerId, expiresAt: new Date(Date.now() + TTL_MS) },
  })
}

// Valida un código; consume el OTP si es correcto. Lanza Error con mensaje en español.
export async function verifyOtp(email: string, purpose: OtpPurpose, code: string) {
  const otp = await db.emailOtp.findFirst({
    where: { email, purpose, consumed: false },
    orderBy: { createdAt: 'desc' },
  })
  if (!otp) throw new Error('Código inválido o ya usado. Solicita uno nuevo.')
  if (otp.expiresAt.getTime() < Date.now()) throw new Error('El código expiró. Solicita uno nuevo.')
  if (otp.attempts >= MAX_ATTEMPTS) {
    throw new Error('Demasiados intentos fallidos. Solicita un código nuevo.')
  }
  if (otp.code !== code) {
    await db.emailOtp.update({ where: { id: otp.id }, data: { attempts: otp.attempts + 1 } })
    throw new Error('Código incorrecto.')
  }
  await db.emailOtp.update({ where: { id: otp.id }, data: { consumed: true } })
  return otp
}
