import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Métricas agregadas para el panel de administración.
// Se agregan en JS (dataset pequeño en SQLite) para no depender de groupBy complejos.
export async function GET() {
  const session = await getSession()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const [businesses, owners, categories, licenses, appointments, visits] =
    await Promise.all([
      db.business.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          category: { select: { name: true } },
          _count: { select: { services: true } },
        },
      }),
      db.businessOwner.count(),
      db.category.count(),
      db.license.findMany({ select: { active: true, endDate: true } }),
      db.appointment.findMany({
        select: {
          businessId: true,
          serviceId: true,
          status: true,
          date: true,
          service: { select: { name: true, price: true } },
        },
      }),
      db.visit.findMany({ select: { businessId: true, createdAt: true } }),
    ])

  const bizName = new Map(businesses.map((b) => [b.id, b]))
  const now = new Date()

  // Métricas por negocio
  const metrics = new Map<
    string,
    {
      visits: number
      appointments: number
      pending: number
      confirmed: number
      completed: number
      cancelled: number
      revenue: number
    }
  >()
  const getM = (id: string) => {
    if (!metrics.has(id)) {
      metrics.set(id, {
        visits: 0,
        appointments: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0,
      })
    }
    return metrics.get(id)!
  }

  for (const v of visits) getM(v.businessId).visits++
  for (const a of appointments) {
    const m = getM(a.businessId)
    m.appointments++
    if (a.status === 'pendiente') m.pending++
    else if (a.status === 'confirmada') m.confirmed++
    else if (a.status === 'completada') {
      m.completed++
      m.revenue += a.service?.price || 0
    } else if (a.status === 'cancelada') m.cancelled++
  }

  // Citas por estado
  const statusCount = new Map<string, number>()
  for (const a of appointments) {
    statusCount.set(a.status, (statusCount.get(a.status) || 0) + 1)
  }
  const appointmentsByStatus = Array.from(statusCount.entries()).map(
    ([status, count]) => ({ status, count })
  )

  // Citas por día (últimos 30 días, incluye días sin citas)
  const days = 30
  const appointmentsByDay: { date: string; count: number }[] = []
  const dayCount = new Map<string, number>()
  for (const a of appointments) {
    const key = a.date.toISOString().split('T')[0]
    dayCount.set(key, (dayCount.get(key) || 0) + 1)
  }
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    appointmentsByDay.push({ date: key, count: dayCount.get(key) || 0 })
  }

  // Top ranking helpers
  const topOf = (
    field: 'visits' | 'appointments',
    limit = 8
  ) =>
    businesses
      .map((b) => ({ id: b.id, name: b.name, slug: b.slug, count: getM(b.id)[field] }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

  // Servicios más agendados
  const serviceCount = new Map<string, number>()
  for (const a of appointments) {
    if (!a.service) continue
    serviceCount.set(a.service.name, (serviceCount.get(a.service.name) || 0) + 1)
  }
  const topServices = Array.from(serviceCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // Comparativa citas: esta semana vs semana anterior
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const twoWeeksAgo = new Date(now)
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const thisWeek = appointments.filter((a) => a.date >= weekAgo && a.date <= now).length
  const lastWeek = appointments.filter(
    (a) => a.date >= twoWeeksAgo && a.date < weekAgo
  ).length

  const businessMetrics: Record<string, ReturnType<typeof getM>> = {}
  for (const [id, m] of metrics) businessMetrics[id] = m

  return NextResponse.json({
    totals: {
      businesses: businesses.length,
      owners,
      categories,
      appointments: appointments.length,
      visits: visits.length,
      activeLicenses: licenses.filter(
        (l) => l.active && new Date(l.endDate) >= now
      ).length,
      services: businesses.reduce((acc, b) => acc + b._count.services, 0),
    },
    appointmentsThisWeek: thisWeek,
    appointmentsLastWeek: lastWeek,
    appointmentsByStatus,
    appointmentsByDay,
    topBusinessesByVisits: topOf('visits'),
    topBusinessesByAppointments: topOf('appointments'),
    topServices,
    businessMetrics,
  })
}
