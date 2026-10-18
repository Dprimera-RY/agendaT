import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSession } from '@/lib/auth'
import { verifyOtp } from '@/lib/otp'

// Verifica la identidad con el código OTP enviado al email y activa la cuenta.
// Body: { email, code }
export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json()
    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }
    if (!code || typeof code !== 'string' || code.trim().length !== 6) {
      return NextResponse.json({ error: 'El código tiene 6 dígitos' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const otp = await verifyOtp(cleanEmail, 'register', code.trim())
    if (!otp.ownerId) {
      return NextResponse.json({ error: 'Código no válido para esta cuenta' }, { status: 400 })
    }

    const owner = await db.businessOwner.update({
      where: { id: otp.ownerId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        email: cleanEmail,
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

    return NextResponse.json({
      role: 'owner',
      name: owner.name,
      username: owner.username,
      redirect,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Error al verificar' },
      { status: 400 }
    )
  }
}
