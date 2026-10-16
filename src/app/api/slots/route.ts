import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { dayOfWeek } from '@/lib/datetime'

// Obtiene los slots disponibles de un negocio en una fecha concreta
// Parámetros:
//   businessId (requerido)
//   date (requerido): YYYY-MM-DD
//   serviceId (opcional): si se pasa, usa su duración; sino 30 min por defecto
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  const dateStr = searchParams.get('date')
  const serviceId = searchParams.get('serviceId')

  if (!businessId || !dateStr) {
    return NextResponse.json(
      { error: 'businessId y date son requeridos' },
      { status: 400 }
    )
  }

  const date = new Date(dateStr + 'T00:00:00')
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
  }

  const dow = dayOfWeek(date)
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: {
      availabilities: { where: { active: true, dayOfWeek: dow } },
      services: { where: { active: true } },
    },
  })
  if (!business) {
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
  }

  if (business.availabilities.length === 0) {
    return NextResponse.json({
      slots: [],
      message: 'El negocio no tiene disponibilidad configurada para este día',
    })
  }

  const avail = business.availabilities[0]
  let durationMin = 30
  if (serviceId) {
    const service = business.services.find((s) => s.id === serviceId)
    if (service) durationMin = service.durationMin
  }

  // Citas existentes para ese día
  const appointments = await db.appointment.findMany({
    where: {
      businessId,
      date: {
        gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
      },
      status: { in: ['pendiente', 'confirmada'] },
    },
    include: { service: true },
  })

  const bookedSlots = appointments.map((a) => ({
    start: a.date,
    end: new Date(a.date.getTime() + (a.service?.durationMin || 60) * 60 * 1000),
  }))

  const [sh, sm] = avail.startTime.split(':').map(Number)
  const [eh, em] = avail.endTime.split(':').map(Number)
  const dayStart = new Date(date)
  dayStart.setHours(sh, sm, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(eh, em, 0, 0)

  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const slots: { start: string; end: string; available: boolean }[] = []
  let cursor = new Date(dayStart)
  while (cursor < dayEnd) {
    const slotEnd = new Date(cursor.getTime() + durationMin * 60 * 1000)
    if (slotEnd > dayEnd) break

    if (isToday && cursor < now) {
      cursor = new Date(slotEnd)
      continue
    }

    const conflict = bookedSlots.some(
      (b) => cursor < b.end && slotEnd > b.start
    )
    slots.push({
      start: `${String(cursor.getHours()).padStart(2, '0')}:${String(cursor.getMinutes()).padStart(2, '0')}`,
      end: `${String(slotEnd.getHours()).padStart(2, '0')}:${String(slotEnd.getMinutes()).padStart(2, '0')}`,
      available: !conflict,
    })
    cursor = new Date(slotEnd)
  }

  return NextResponse.json({ slots, availability: avail })
}
