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
  const durationParam = Number(searchParams.get('durationMin'))

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
  // durationMin (multi-servicio) tiene prioridad sobre la duración del serviceId
  let durationMin = 30
  if (Number.isFinite(durationParam) && durationParam > 0) {
    durationMin = Math.min(durationParam, 24 * 60)
  } else if (serviceId) {
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

  // Horario de no atención (almuerzo), opcional
  let breakStart: Date | null = null
  let breakEnd: Date | null = null
  if (avail.breakStart && avail.breakEnd) {
    const [bsh, bsm] = avail.breakStart.split(':').map(Number)
    const [beh, bem] = avail.breakEnd.split(':').map(Number)
    breakStart = new Date(date)
    breakStart.setHours(bsh, bsm, 0, 0)
    breakEnd = new Date(date)
    breakEnd.setHours(beh, bem, 0, 0)
  }

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

    // Excluir slots dentro del horario de no atención (almuerzo)
    if (breakStart && breakEnd && cursor < breakEnd && slotEnd > breakStart) {
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
