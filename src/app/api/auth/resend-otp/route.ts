import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/mailer'

// Reenvía el código OTP al email del dueño pendiente de verificar.
// Body: { email, purpose? }  (purpose: register | reset, por defecto register)
export async function POST(req: NextRequest) {
  try {
    const { email, purpose } = await req.json()
    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }
    const cleanEmail = email.trim().toLowerCase()
    const p = purpose === 'reset' ? 'reset' : 'register'

    let ownerId: string | undefined
    if (p === 'register') {
      const owner = await db.businessOwner.findFirst({
        where: { email: cleanEmail, emailVerified: false },
      })
      if (!owner) return NextResponse.json({ ok: true, sent: false })
      ownerId = owner.id
    } else {
      const owner = await db.businessOwner.findFirst({ where: { email: cleanEmail } })
      if (!owner) return NextResponse.json({ ok: true, sent: false })
      ownerId = owner.id
    }

    const otp = await createOtp(cleanEmail, p, ownerId)
    const sent = await sendOtpEmail(cleanEmail, otp.code, p)
    return NextResponse.json({ ok: true, sent })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
