import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { dayOfWeek } from '@/lib/datetime'

// Búsqueda avanzada de disponibilidad:
// Filtra negocios por categoría y verifica si tienen al menos un slot
// disponible en una fecha/hora específica.
//
// Parámetros:
//   categoryId (opcional): filtrar por tipo de negocio
//   date (requerido): YYYY-MM-DD
//   time (opcional): HH:mm — si se pasa, busca negocios con slot libre a esa hora
//   durationMin (opcional, default 60): duración del servicio a buscar
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId') || undefined
  const dateStr = searchParams.get('date')
  const timeStr = searchParams.get('time')
  const durationMin = Number(searchParams.get('durationMin') || 60)

  if (!dateStr) {
    return NextResponse.json(
      { error: 'Parámetro date es requerido (YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  const date = new Date(dateStr + 'T00:00:00')
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
  }

  const dow = dayOfWeek(date)
  const now = new Date()

  // Traer todos los negocios activos con licencia válida
  const businesses = await db.business.findMany({
    where: categoryId ? { categoryId } : {},
    include: {
      category: true,
      license: true,
      availabilities: { where: { active: true, dayOfWeek: dow } },
      services: { where: { active: true } },
      appointments: {
        where: {
          date: {
            gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
          },
          status: { in: ['pendiente', 'confirmada'] },
        },
      },
    },
  })

  const validBusinesses = businesses.filter((b) => {
    if (!b.license) return false
    if (!b.license.active) return false
    if (b.license.endDate < now) return false
    if (b.availabilities.length === 0) return false
    return true
  })

  const results = validBusinesses.map((b) => {
    // Calcular slots disponibles para ese día
    const avail = b.availabilities[0]
    if (!avail) return null

    const [sh, sm] = avail.startTime.split(':').map(Number)
    const [eh, em] = avail.endTime.split(':').map(Number)
    const dayStart = new Date(date)
    dayStart.setHours(sh, sm, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(eh, em, 0, 0)

    // Slots basados en la duración solicitada
    const slots: { start: string; available: boolean }[] = []
    const cursor = new Date(dayStart)
    while (cursor < dayEnd) {
      const slotEnd = new Date(cursor.getTime() + durationMin * 60 * 1000)
      if (slotEnd > dayEnd) break

      // No mostrar slots del pasado si es hoy
      if (cursor < now && date.toDateString() === new Date().toDateString()) {
        cursor = new Date(slotEnd)
        continue
      }

      const conflict = b.appointments.some((a) => {
        const aEnd = new Date(a.date.getTime() + (a.service?.durationMin || 60) * 60 * 1000)
        return cursor < aEnd && slotEnd > a.date
      })
      slots.push({
        start: `${String(cursor.getHours()).padStart(2, '0')}:${String(cursor.getMinutes()).padStart(2, '0')}`,
        available: !conflict,
      })
      cursor = new Date(slotEnd)
    }

    const availableSlots = slots.filter((s) => s.available)

    // Si se solicitó un horario específico, verificar match exacto o slot que cubra esa hora
    let hasTimeMatch = true
    if (timeStr) {
      hasTimeMatch = availableSlots.some((s) => s.start === timeStr)
    }

    return {
      id: b.id,
      slug: b.slug,
      name: b.name,
      description: b.description,
      logo: b.logo,
      photo1: b.photo1,
      address: b.address,
      phone: b.phone,
      category: b.category,
      totalSlots: slots.length,
      availableCount: availableSlots.length,
      availableSlots,
      hasTimeMatch,
    }
  }).filter(Boolean)

  // Si se solicitó hora, devolver sólo los que tienen match; sino todos con disponibilidad
  const finalResults = timeStr
    ? (results as any[]).filter((r) => r.hasTimeMatch)
    : (results as any[]).filter((r) => r.availableCount > 0)

  return NextResponse.json(finalResults)
}
