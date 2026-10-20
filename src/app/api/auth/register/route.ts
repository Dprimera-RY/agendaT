import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/mailer'

// REGISTRO de un nuevo dueño de negocio
// Requiere email real + aceptar términos. NO crea sesión: hasta que el email
// no se verifique con el código OTP, la cuenta no puede usarse.
export async function POST(req: NextRequest) {
  try {
    const { name, username, password, email, phone, terms } = await req.json()

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: 'Nombre, usuario y contraseña son obligatorios' },
        { status: 400 }
      )
    }
    if (password.length < 4) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 4 caracteres' },
        { status: 400 }
      )
    }
    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return NextResponse.json(
        { error: 'Debes indicar un email válido: se usará para verificar tu identidad' },
        { status: 400 }
      )
    }
    if (terms !== true) {
      return NextResponse.json(
        { error: 'Debes aceptar los Términos y Condiciones y el Uso de Datos' },
        { status: 400 }
      )
    }

    // Verificar que el username no exista ni en admin ni en owner
    const [existingAdmin, existingOwner] = await Promise.all([
      db.admin.findUnique({ where: { username } }),
      db.businessOwner.findUnique({ where: { username } }),
    ])
    if (existingAdmin || existingOwner) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya está en uso' },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()

    // Verificar unicidad de email y teléfono entre dueños
    const [emailTaken, phoneTaken] = await Promise.all([
      db.businessOwner.findFirst({ where: { email: cleanEmail } }),
      phone ? db.businessOwner.findFirst({ where: { phone } }) : Promise.resolve(null),
    ])
    if (emailTaken) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con ese email' },
        { status: 400 }
      )
    }
    if (phoneTaken) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con ese número de móvil' },
        { status: 400 }
      )
    }

    const owner = await db.businessOwner.create({
      data: {
        name,
        username,
        password,
        email: cleanEmail,
        phone,
        emailVerified: false,
      },
    })

    // Código OTP de 6 dígitos enviado a su email
    const otp = await createOtp(cleanEmail, 'register', owner.id)
    const sent = await sendOtpEmail(cleanEmail, otp.code, 'register')

    return NextResponse.json(
      { needsVerification: true, email: cleanEmail, sent },
      { status: 201 }
    )
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
