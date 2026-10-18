import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSession } from '@/lib/auth'
import { verifyOtp } from '@/lib/otp'

// Restablece la contraseña con el código OTP recibido por email.
// Body: { email, code, password }
export async function POST(req: NextRequest) {
  try {
    const { email, code, password } = await req.json()
    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 4 caracteres' },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()
    const otp = await verifyOtp(cleanEmail, 'reset', String(code || '').trim())
    if (!otp.ownerId) {
      return NextResponse.json({ error: 'Código no válido' }, { status: 400 })
    }

    // Quien demuestra control del email también queda verificado
    const owner = await db.businessOwner.update({
      where: { id: otp.ownerId },
      data: {
        password,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
      include: {
        businesses: {
          select: { id: true, slug: true, name: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    await setSession({
      role: 'owner',
      ownerId: owner.id,
      name: owner.name,
      username: owner.username,
    })

    const redirect =
      owner.businesses.length > 0
        ? `/negocio/${owner.businesses[0].slug}/panel`
        : '/crear-negocio'

    return NextResponse.json({ ok: true, redirect, username: owner.username })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Error al restablecer' },
      { status: 400 }
    )
  }
}
