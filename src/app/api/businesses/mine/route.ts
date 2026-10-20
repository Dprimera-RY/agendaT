import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { isValidProvince } from '@/lib/provinces'

// Permite a un dueño autenticado crear su primer (o siguiente) negocio
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (session.role !== 'owner' && session.role !== 'admin') {
    return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
  }

  try {
    const data = await req.json()
    const {
      name,
      slug,
      description,
      address,
      province,
      phone,
      email,
      categoryId,
      logo,
      photo1,
      photo2,
      photo3,
    } = data

    if (!name || !slug || !categoryId) {
      return NextResponse.json(
        { error: 'Nombre, slug (URL) y categoría son obligatorios' },
        { status: 400 }
      )
    }
    if (!province || !isValidProvince(province)) {
      return NextResponse.json({ error: 'Debes seleccionar una provincia válida' }, { status: 400 })
    }

    // Si es owner, usar su propio ID; si es admin, requerir ownerId
    let ownerId = session.ownerId
    if (session.role === 'admin') {
      if (!data.ownerId) {
        return NextResponse.json(
          { error: 'Como admin debes especificar ownerId' },
          { status: 400 }
        )
      }
      ownerId = data.ownerId
    }

    if (!ownerId) {
      return NextResponse.json({ error: 'ownerId requerido' }, { status: 400 })
    }

    // Verificar slug único
    const existing = await db.business.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        { error: 'La URL del negocio ya está en uso. Prueba con otra.' },
        { status: 400 }
      )
    }

    const business = await db.business.create({
      data: {
        name,
        slug,
        description,
        address,
        province: province || null,
        phone,
        email,
        logo,
        photo1,
        photo2,
        photo3,
        ownerId,
        categoryId,
      },
    })

    // Licencia de prueba: primer negocio → trialDaysFirst (30 por defecto);
    // negocios siguientes → trialDaysExtra (5 por defecto). Ambos valores
    // configurables desde el panel de administración (Settings).
    // Nota: el count incluye el negocio recién creado, por eso <= 1.
    const ownerBusinessCount = await db.business.count({ where: { ownerId } })
    const isFirst = ownerBusinessCount <= 1
    const trialKey = isFirst ? 'trialDaysFirst' : 'trialDaysExtra'
    const fallbackDays = isFirst ? 30 : 5
    const trialSetting = await db.setting.findUnique({ where: { key: trialKey } })
    const licenseDays = Math.max(1, Number(trialSetting?.value) || fallbackDays)
    const now = new Date()
    await db.license.create({
      data: {
        businessId: business.id,
        startDate: now,
        endDate: new Date(now.getTime() + licenseDays * 24 * 60 * 60 * 1000),
        durationDays: licenseDays,
        active: true,
        notes: `Licencia inicial de prueba gratuita (${licenseDays} días)`,
      },
    })

    // Crear disponibilidad por defecto Lun-Vie 9-18
    for (const dow of [1, 2, 3, 4, 5]) {
      await db.availability.create({
        data: {
          businessId: business.id,
          dayOfWeek: dow,
          startTime: '09:00',
          endTime: '18:00',
          active: true,
        },
      })
    }

    return NextResponse.json({ ...business, trialDays: licenseDays }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
