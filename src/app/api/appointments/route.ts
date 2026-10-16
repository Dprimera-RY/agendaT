import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Crear una nueva cita (endpoint público, lo usa cualquier cliente)
// Esta ruta SIMULA el envío de WhatsApp al dueño con el mensaje generado.
export async function POST(req: NextRequest) {
  try {
    const {
      businessId,
      serviceId,
      customerName,
      customerPhone,
      customerEmail,
      date, // ISO string
      notes,
    } = await req.json()

    if (!businessId || !serviceId || !customerName || !customerPhone || !date) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
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

    // Verificar que el slot esté disponible
    const service = await db.service.findUnique({ where: { id: serviceId } })
    if (!service || service.businessId !== businessId) {
      return NextResponse.json({ error: 'Servicio inválido' }, { status: 400 })
    }

    const appointmentDate = new Date(date)
    const appointmentEnd = new Date(
      appointmentDate.getTime() + service.durationMin * 60 * 1000
    )

    // Verificar conflictos
    const conflicts = await db.appointment.findMany({
      where: {
        businessId,
        status: { in: ['pendiente', 'confirmada'] },
        date: {
          gte: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate()),
          lt: new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate() + 1),
        },
      },
      include: { service: true },
    })
    const conflict = conflicts.some((c) => {
      const cEnd = new Date(c.date.getTime() + (c.service?.durationMin || 60) * 60 * 1000)
      return appointmentDate < cEnd && appointmentEnd > c.date
    })
    if (conflict) {
      return NextResponse.json(
        { error: 'El horario seleccionado ya no está disponible' },
        { status: 409 }
      )
    }

    const appointment = await db.appointment.create({
      data: {
        businessId,
        serviceId,
        customerName,
        customerPhone,
        customerEmail,
        date: appointmentDate,
        status: 'pendiente',
        notes,
      },
      include: { service: true, business: true },
    })

    // ===== SIMULACIÓN DE NOTIFICACIÓN WHATSAPP AL DUEÑO =====
    // Como no podemos enviar WhatsApp real, guardamos el mensaje que se enviaría
    // en una "cola" simulada como nota en la cita. El dueño lo ve en su panel.
    const ownerPhone = business.owner.phone || business.phone
    const whatsappMessage = `🟢 *NUEVA CITA AGENDADA*

📋 Negocio: ${business.name}
👤 Cliente: ${customerName}
📞 Teléfono: ${customerPhone}
💅 Servicio: ${service.name} ($${service.price})
📅 Fecha: ${appointmentDate.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}
⏱️ Duración: ${service.durationMin} min

Para CONFIRMAR la cita, el cliente debe realizar el depósito.
Una vez recibido el depósito, marca la cita como confirmada en tu panel.

Responde a este mensaje o ingresa a tu panel de gestión para confirmar.`

    await db.appointment.update({
      where: { id: appointment.id },
      data: {
        notes: notes
          ? `${notes}\n\n--- WhatsApp al dueño (${ownerPhone}) ---\n${whatsappMessage}`
          : `--- WhatsApp al dueño (${ownerPhone}) ---\n${whatsappMessage}`,
      },
    })

    return NextResponse.json(
      {
        ...appointment,
        whatsappNotification: {
          to: ownerPhone,
          message: whatsappMessage,
          sent: true,
          simulated: true,
        },
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

// Lista las citas de un negocio (público para dueño/admin vía session, o por businessId)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

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
