import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { dayOfWeek } from '@/lib/datetime'
import { waLink, msgNewAppointment } from '@/lib/whatsapp'
import { pushToOwner } from '@/lib/push'

// Crear nuevas citas (endpoint público, lo usa cualquier cliente).
// Acepta serviceIds: string[] (multi-servicio, citas encadenadas) o serviceId (legacy, una sola cita).
// Esta ruta SIMULA el envío de WhatsApp al dueño con el mensaje generado.
export async function POST(req: NextRequest) {
  try {
    const {
      businessId,
      serviceId,
      serviceIds,
      customerName,
      customerPhone,
      customerEmail,
      customerHash, // hash anónimo del cliente (localStorage) para "mis citas"
      date, // ISO string
      notes,
      byOwner, // true cuando el dueño agenda desde su panel (no simular WhatsApp)
    } = await req.json()

    if (!businessId || !customerName || !customerPhone || !date) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    // Normalizar lista de servicios (multi) o único (legacy)
    const ids: string[] = Array.isArray(serviceIds) && serviceIds.length > 0
      ? serviceIds.filter((s: unknown) => typeof s === 'string' && s)
      : serviceId
      ? [serviceId]
      : []
    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'Debes seleccionar al menos un servicio' },
        { status: 400 }
      )
    }

    // Verificar que el negocio exista y tenga licencia activa
    const business = await db.business.findUnique({
      where: { id: businessId },
      include: { license: true, owner: true },
    })
    if (!business || !business.license || !business.license.active) {
      return NextResponse.json(
        { error: 'Negocio no disponible para reservas' },
        { status: 400 }
      )
    }
    if (business.license.endDate < new Date()) {
      return NextResponse.json(
        { error: 'La licencia del negocio ha expirado' },
        { status: 400 }
      )
    }

    // Verificar que todos los servicios pertenezcan al negocio y estén activos
    const services = await db.service.findMany({
      where: { id: { in: ids }, businessId, active: true },
    })
    if (services.length !== ids.length) {
      return NextResponse.json({ error: 'Servicio inválido' }, { status: 400 })
    }
    // Ordenar según el orden elegido por el cliente
    const orderedServices = ids.map((id) => services.find((s) => s.id === id)!)
    const totalDurationMin = orderedServices.reduce((sum, s) => sum + s.durationMin, 0)

    const appointmentStart = new Date(date)
    const appointmentEnd = new Date(
      appointmentStart.getTime() + totalDurationMin * 60 * 1000
    )

    // Validar que el rango completo quepa en el horario de disponibilidad del día
    const dow = dayOfWeek(appointmentStart)
    const availabilities = await db.availability.findMany({
      where: { businessId, dayOfWeek: dow, active: true },
    })
    if (availabilities.length === 0) {
      return NextResponse.json(
        { error: 'El negocio no tiene disponibilidad este día' },
        { status: 400 }
      )
    }
    const fitsAvailability = availabilities.some((a) => {
      const [sh, sm] = a.startTime.split(':').map(Number)
      const [eh, em] = a.endTime.split(':').map(Number)
      const dayStart = new Date(appointmentStart)
      dayStart.setHours(sh, sm, 0, 0)
      const dayEnd = new Date(appointmentStart)
      dayEnd.setHours(eh, em, 0, 0)
      return appointmentStart >= dayStart && appointmentEnd <= dayEnd
    })
    if (!fitsAvailability) {
      return NextResponse.json(
        { error: 'El horario seleccionado excede el tiempo disponible del negocio' },
        { status: 400 }
      )
    }

    // Horario de no atención (almuerzo) — solo aplica a reservas del público
    if (!byOwner) {
      const overlapsBreak = availabilities.some((a) => {
        if (!a.breakStart || !a.breakEnd) return false
        const [bsh, bsm] = a.breakStart.split(':').map(Number)
        const [beh, bem] = a.breakEnd.split(':').map(Number)
        const breakStart = new Date(appointmentStart)
        breakStart.setHours(bsh, bsm, 0, 0)
        const breakEnd = new Date(appointmentStart)
        breakEnd.setHours(beh, bem, 0, 0)
        return appointmentStart < breakEnd && appointmentEnd > breakStart
      })
      if (overlapsBreak) {
        return NextResponse.json(
          { error: 'Ese horario está dentro del tiempo de no atención (almuerzo)' },
          { status: 400 }
        )
      }
    }

    // Verificar conflictos en el rango total contra otras citas
    const conflicts = await db.appointment.findMany({
      where: {
        businessId,
        status: { in: ['pendiente', 'confirmada'] },
        date: {
          gte: new Date(appointmentStart.getFullYear(), appointmentStart.getMonth(), appointmentStart.getDate()),
          lt: new Date(appointmentStart.getFullYear(), appointmentStart.getMonth(), appointmentStart.getDate() + 1),
        },
      },
      include: { service: true },
    })
    const conflict = conflicts.some((c) => {
      const cEnd = new Date(c.date.getTime() + (c.service?.durationMin || 60) * 60 * 1000)
      return appointmentStart < cEnd && appointmentEnd > c.date
    })
    if (conflict) {
      return NextResponse.json(
        { error: 'El horario seleccionado ya no está disponible' },
        { status: 409 }
      )
    }

    const customerHashValid =
      typeof customerHash === 'string' && /^[a-zA-Z0-9-]{20,64}$/.test(customerHash)
        ? customerHash
        : null

    // Crear una cita por servicio, encadenadas una tras otra
    let cursor = new Date(appointmentStart)
    const created = await db.$transaction(async (tx) => {
      const results: Prisma.AppointmentGetPayload<{ include: { service: true; business: true } }>[] = []
      for (const service of orderedServices) {
        results.push(
          await tx.appointment.create({
            data: {
              businessId,
              serviceId: service.id,
              customerName,
              customerPhone,
              customerEmail,
              customerHash: customerHashValid,
              date: new Date(cursor),
              status: 'pendiente',
              notes,
              // Si el negocio exige depósito, queda registrado el monto esperado
              ...(business.depositEnabled && business.depositAmount > 0
                ? { depositAmount: business.depositAmount }
                : {}),
            },
            include: { service: true, business: true },
          })
        )
        cursor = new Date(cursor.getTime() + service.durationMin * 60 * 1000)
      }
      return results
    })

    // ===== NOTIFICACIÓN WHATSAPP AL DUEÑO (link real wa.me) + PUSH =====
    // Si la cita la agendó el propio dueño (byOwner), no se notifica.
    const ownerPhone = business.owner.phone || business.phone
    let whatsappNotification: {
      to: string | null
      message: string
      link: string | null
      sent: boolean
      simulated: boolean
    } | null = null
    if (!byOwner) {
      const servicesList = orderedServices
        .map((s) => `${s.name} ($${s.price}, ${s.durationMin} min)`)
        .join(' + ')
      const whatsappMessage = msgNewAppointment({
        businessName: business.name,
        customerName,
        customerPhone,
        servicesList,
        date: appointmentStart,
        totalDurationMin,
      })
      const ownerLink = waLink(ownerPhone, whatsappMessage)

      await db.appointment.updateMany({
        where: { id: { in: created.map((a) => a.id) } },
        data: {
          notes: notes
            ? `${notes}\n\n--- WhatsApp al dueño (${ownerPhone}) ---\n${whatsappMessage}`
            : `--- WhatsApp al dueño (${ownerPhone}) ---\n${whatsappMessage}`,
        },
      })

      whatsappNotification = {
        to: ownerPhone,
        message: whatsappMessage,
        link: ownerLink,
        sent: true,
        simulated: ownerLink === null,
      }

      // Push instantáneo al dueño (si activó notificaciones en su panel)
      pushToOwner(business.ownerId, {
        title: `Nueva cita — ${business.name}`,
        body: `${customerName}: ${orderedServices.map((s) => s.name).join(' + ')} · ${appointmentStart.toLocaleString('es-ES', {
          dateStyle: 'short',
          timeStyle: 'short',
        })}`,
        url: `#/negocio/${business.slug}/panel`,
      }).catch(() => {})
    }

    return NextResponse.json(
      {
        appointments: created,
        whatsappNotification,
      },
      { status: 201 }
    )
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    )
  }
}

// Lista las citas de un negocio (por businessId) o las citas de un cliente anónimo (por customerHash)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  const customerHash = searchParams.get('customerHash')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  // "Mis citas": el cliente anónimo consulta sus citas con su hash (localStorage)
  if (customerHash && !businessId) {
    if (!/^[a-zA-Z0-9-]{20,64}$/.test(customerHash)) {
      return NextResponse.json({ error: 'customerHash inválido' }, { status: 400 })
    }
    const appointments = await db.appointment.findMany({
      where: { customerHash },
      include: { service: true, business: true },
      orderBy: { date: 'desc' },
      take: 100,
    })
    return NextResponse.json(appointments)
  }

  if (!businessId) {
    return NextResponse.json(
      { error: 'businessId es requerido' },
      { status: 400 }
    )
  }

  const where: {
    businessId: string
    date?: { gte?: Date; lte?: Date }
  } = { businessId }

  if (from || to) {
    where.date = {}
    if (from) where.date.gte = new Date(from)
    if (to) where.date.lte = new Date(to)
  }

  const appointments = await db.appointment.findMany({
    where,
    include: { service: true },
    orderBy: { date: 'asc' },
  })
  return NextResponse.json(appointments)
}
