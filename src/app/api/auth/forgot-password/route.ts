import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/mailer'

// Solicitud de recuperación de contraseña: envía un código OTP al email.
// Body: { email }
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }
    const cleanEmail = email.trim().toLowerCase()

    const owners = await db.businessOwner.findMany({ where: { email: cleanEmail }, take: 5 })
    let sent = false
    for (const owner of owners) {
      const otp = await createOtp(cleanEmail, 'reset', owner.id)
      const ok = await sendOtpEmail(cleanEmail, otp.code, 'reset')
      sent = sent || ok
    }

    // Respuesta genérica: no revela si existe la cuenta
    return NextResponse.json({ ok: true, sent: owners.length > 0 && sent })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
